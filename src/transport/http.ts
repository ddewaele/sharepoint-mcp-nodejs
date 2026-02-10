import { randomUUID } from "node:crypto";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Config } from "../config.js";
import { createAuthProvider } from "../auth/index.js";
import { GraphClient } from "../graph/client.js";
import { resolveSiteId } from "../graph/sites.js";
import { createServer } from "../server.js";
import { setSessionContext, deleteSessionContext, STDIO_SESSION_KEY } from "../tools/index.js";

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

  // Track active transports by session ID
  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.all("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    // If we have a session ID, route to the existing transport
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // For non-initialization requests with an unknown session, reject
    if (sessionId && !transports.has(sessionId)) {
      res.status(404).json({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid Request: Session not found" },
        id: null,
      });
      return;
    }

    // New session: create a fresh server + transport pair
    // Generate the session ID upfront so we can register before handleRequest
    const newSessionId = randomUUID();

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
    });

    const server = createServer();
    await server.connect(transport);

    // Register the transport immediately using the known session ID
    transports.set(newSessionId, transport);

    // Set up Graph context using the known session ID
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
          transports.delete(newSessionId);
          res.status(401).json({ error: "Authentication failed" });
          return;
        }
      }
    } else if (sharedGraphClient && sharedSiteId) {
      setSessionContext(newSessionId, {
        graphClient: sharedGraphClient,
        siteId: sharedSiteId,
      });
      // Also store under the default key so getDefaultContext() works
      setSessionContext(STDIO_SESSION_KEY, {
        graphClient: sharedGraphClient,
        siteId: sharedSiteId,
      });
    }

    // Clean up on close
    transport.onclose = () => {
      transports.delete(newSessionId);
      deleteSessionContext(newSessionId);
    };

    await transport.handleRequest(req, res, req.body);
  });

  const port = config.httpPort;
  app.listen(port, "0.0.0.0", () => {
    console.error(`SharePoint MCP Server running on http://0.0.0.0:${port}/mcp`);
  });
}
