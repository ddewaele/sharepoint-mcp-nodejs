import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listFolders, createFolder, deleteFolder, getFolderTree } from "../graph/folders.js";
import { getDefaultContext } from "./context.js";
import { toolResult, handleToolError } from "./utils.js";
import type { TreeNode } from "../graph/types.js";

function formatTree(nodes: TreeNode[], indent: string = ""): string {
  return nodes
    .map((node) => {
      const icon = node.type === "folder" ? "📁" : "📄";
      const size = node.size != null ? ` (${node.size} bytes)` : "";
      const line = `${indent}${icon} ${node.name}${size}`;
      if (node.children?.length) {
        return line + "\n" + formatTree(node.children, indent + "  ");
      }
      return line;
    })
    .join("\n");
}

export function registerFolderTools(server: McpServer): void {
  server.tool(
    "List_SharePoint_Folders",
    "List folders in a SharePoint directory",
    { folder_path: z.string().optional().describe("Folder path (e.g. 'Documents/Reports'). Empty for root.") },
    async ({ folder_path }) =>
      handleToolError(async () => {
        const { graphClient, siteId } = getDefaultContext();
        const folders = await listFolders(graphClient, siteId, folder_path);
        if (folders.length === 0) {
          return toolResult("No folders found.");
        }
        const lines = folders.map(
          (f) => `📁 ${f.name} (${f.folder?.childCount ?? 0} items)`,
        );
        return toolResult(lines.join("\n"));
      }),
  );

  server.tool(
    "Create_Folder",
    "Create a new folder in SharePoint",
    {
      parent_path: z.string().describe("Parent folder path (e.g. 'Documents'). Use '/' for root."),
      folder_name: z.string().describe("Name of the new folder"),
    },
    async ({ parent_path, folder_name }) =>
      handleToolError(async () => {
        const { graphClient, siteId } = getDefaultContext();
        const item = await createFolder(graphClient, siteId, parent_path, folder_name);
        return toolResult(`Folder created: ${item.name} (${item.webUrl})`);
      }),
  );

  server.tool(
    "Delete_Folder",
    "Delete a folder from SharePoint",
    {
      folder_path: z.string().describe("Path of the folder to delete (e.g. 'Documents/OldFolder')"),
    },
    async ({ folder_path }) =>
      handleToolError(async () => {
        const { graphClient, siteId } = getDefaultContext();
        await deleteFolder(graphClient, siteId, folder_path);
        return toolResult(`Folder deleted: ${folder_path}`);
      }),
  );

  server.tool(
    "Get_SharePoint_Tree",
    "Get a recursive tree view of files and folders",
    {
      folder_path: z.string().optional().describe("Starting folder path. Empty for root."),
      max_depth: z.number().optional().default(3).describe("Maximum depth to traverse (default: 3)"),
    },
    async ({ folder_path, max_depth }) =>
      handleToolError(async () => {
        const { graphClient, siteId } = getDefaultContext();
        const tree = await getFolderTree(graphClient, siteId, folder_path, max_depth);
        if (tree.length === 0) {
          return toolResult("Empty directory.");
        }
        return toolResult(formatTree(tree));
      }),
  );
}
