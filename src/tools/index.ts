import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFolderTools } from "./folder-tools.js";
import { registerDocumentTools } from "./document-tools.js";

export { setSessionContext, getSessionContext, deleteSessionContext, getDefaultContext, STDIO_SESSION_KEY } from "./context.js";
export type { SessionContext } from "./context.js";

export function registerAllTools(server: McpServer): void {
  registerFolderTools(server);
  registerDocumentTools(server);
}
