import { randomUUID } from "node:crypto";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Config } from "../config.js";
import { createAuthProvider } from "../auth/index.js";
import { GraphClient } from "../graph/client.js";
import { resolveSiteId } from "../graph/sites.js";
import { createServer } from "../server.js";
import { setSessionContext, deleteSessionContext, STDIO_SESSION_KEY } from "../tools/index.js";

// Sessions idle longer than this are eligible for cleanup
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_CLEANUP_INTERVAL_MS = 60 * 1000; // run every minute

interface SessionEntry {
  transport: StreamableHTTPServerTransport;
  lastActivityAt: number;
}

export async function startHttpTransport(config: Config): Promise<void> {
  // For client_credentials, resolve the shared Graph context once at startup.
  let sharedGraphClient: GraphClient | undefined;
  let sharedSiteId: string | undefined;

  if (config.authFlow === "client_credentials") {
    const auth = createAuthProvider(config);
    sharedGraphClient = new GraphClient(auth);
    sharedSiteId = await resolveSiteId(
      sharedGraphClient,
      config.sharepointHostname,
      config.sharepointSiteName,
    );
  }

  const app = express();
  app.use(express.json());

  // Track active sessions: session ID → { transport, lastActivityAt }
  const sessions = new Map<string, SessionEntry>();

  function deleteSession(sessionId: string): void {
    const entry = sessions.get(sessionId);
    if (!entry) return;
    sessions.delete(sessionId);
    deleteSessionContext(sessionId);
    entry.transport.close().catch(() => {});
  }

  // Periodically evict sessions that have been idle longer than SESSION_TTL_MS
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    let evicted = 0;
    for (const [id, entry] of sessions) {
      if (now - entry.lastActivityAt > SESSION_TTL_MS) {
        deleteSession(id);
        evicted++;
      }
    }
    if (evicted > 0 || sessions.size > 0) {
      console.error(`[MCP] Session cleanup: evicted=${evicted} active=${sessions.size}`);
    }
  }, SESSION_CLEANUP_INTERVAL_MS);

  // Don't let the cleanup timer prevent process exit
  cleanupTimer.unref();

  app.all("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    // Route to existing session and refresh its activity timestamp
    if (sessionId && sessions.has(sessionId)) {
      const entry = sessions.get(sessionId)!;
      entry.lastActivityAt = Date.now();
      await entry.transport.handleRequest(req, res, req.body);
      return;
    }

    // Reject requests for unknown sessions (client should reinitialise)
    if (sessionId && !sessions.has(sessionId)) {
      res.status(404).json({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid Request: Session not found" },
        id: null,
      });
      return;
    }

    // New session: create a fresh server + transport pair
    const newSessionId = randomUUID();

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
    });

    const server = createServer();
    await server.connect(transport);

    sessions.set(newSessionId, { transport, lastActivityAt: Date.now() });
    console.error(`[MCP] New session: ${newSessionId} (total: ${sessions.size})`);

    // Set up Graph context
    if (config.authFlow === "on_behalf_of") {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const userToken = authHeader.slice(7);
        try {
          const auth = createAuthProvider(config, userToken);
          const graphClient = new GraphClient(auth);
          const siteId = await resolveSiteId(
            graphClient,
            config.sharepointHostname,
            config.sharepointSiteName,
          );
          setSessionContext(newSessionId, { graphClient, siteId });
        } catch (err) {
          console.error("OBO auth setup failed:", err);
          deleteSession(newSessionId);
          res.status(401).json({ error: "Authentication failed" });
          return;
        }
      }
    } else if (sharedGraphClient && sharedSiteId) {
      setSessionContext(newSessionId, {
        graphClient: sharedGraphClient,
        siteId: sharedSiteId,
      });
      setSessionContext(STDIO_SESSION_KEY, {
        graphClient: sharedGraphClient,
        siteId: sharedSiteId,
      });
    }

    // Clean up when transport explicitly closes (e.g. DELETE request)
    transport.onclose = () => {
      console.error(`[MCP] Session closed: ${newSessionId} (total: ${sessions.size - 1})`);
      deleteSession(newSessionId);
    };

    await transport.handleRequest(req, res, req.body);
  });

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", sessions: sessions.size });
  });

  const port = config.httpPort;
  app.listen(port, "0.0.0.0", () => {
    console.error(`SharePoint MCP Server running on http://0.0.0.0:${port}/mcp`);
  });
}
