import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../config.js";
import { createAuthProvider } from "../auth/index.js";
import { GraphClient } from "../graph/client.js";
import { resolveSiteId } from "../graph/sites.js";
import { setSessionContext, STDIO_SESSION_KEY } from "../tools/index.js";

export async function startStdioTransport(
  server: McpServer,
  config: Config,
): Promise<void> {
  const auth = createAuthProvider(config);
  const graphClient = new GraphClient(auth);
  const siteId = await resolveSiteId(
    graphClient,
    config.sharepointHostname,
    config.sharepointSiteName,
  );

  setSessionContext(STDIO_SESSION_KEY, { graphClient, siteId });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("SharePoint MCP Server running on stdio");
}
