import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  listDocuments,
  getDocumentContent,
  uploadDocument,
  uploadDocumentFromPath,
  updateDocument,
  deleteDocument,
} from "../graph/documents.js";
import { getDefaultContext } from "./context.js";
import { toolResult, handleToolError } from "./utils.js";
import { extractContent } from "../extraction/index.js";

export function registerDocumentTools(server: McpServer): void {
  server.tool(
    "List_SharePoint_Documents",
    "List documents in a SharePoint folder with metadata",
    {
      folder_path: z.string().optional().describe("Folder path. Empty for root."),
    },
    async ({ folder_path }) =>
      handleToolError(async () => {
        const { graphClient, siteId } = getDefaultContext();
        const docs = await listDocuments(graphClient, siteId, folder_path);
        if (docs.length === 0) {
          return toolResult("No documents found.");
        }
        const lines = docs.map(
          (d) =>
            `📄 ${d.name} (${d.size ?? 0} bytes, modified: ${d.lastModifiedDateTime ?? "unknown"})`,
        );
        return toolResult(lines.join("\n"));
      }),
  );

  server.tool(
    "Get_Document_Content",
    "Download and extract text content from a SharePoint document (PDF, Word, Excel, text)",
    {
      file_path: z.string().describe("Full path to the file (e.g. 'Documents/report.pdf')"),
    },
    async ({ file_path }) =>
      handleToolError(async () => {
        const { graphClient, siteId } = getDefaultContext();
        const { buffer, item } = await getDocumentContent(graphClient, siteId, file_path);
        const text = await extractContent(buffer, item.name);
        return toolResult(text);
      }),
  );

  server.tool(
    "Upload_Document",
    "Upload a document to SharePoint from base64 or text content",
    {
      folder_path: z.string().describe("Destination folder path"),
      file_name: z.string().describe("File name (e.g. 'report.txt')"),
      content: z.string().describe("File content (text or base64-encoded)"),
      encoding: z.enum(["text", "base64"]).default("text").describe("Content encoding"),
    },
    async ({ folder_path, file_name, content, encoding }) =>
      handleToolError(async () => {
        const { graphClient, siteId } = getDefaultContext();
        const buffer =
          encoding === "base64"
            ? Buffer.from(content, "base64")
            : Buffer.from(content, "utf-8");
        const item = await uploadDocument(graphClient, siteId, folder_path, file_name, buffer);
        return toolResult(`Uploaded: ${item.name} (${item.size} bytes) - ${item.webUrl}`);
      }),
  );

  server.tool(
    "Upload_Document_From_Path",
    "Upload a local file to SharePoint (supports resumable upload for files >4MB)",
    {
      folder_path: z.string().describe("Destination folder path in SharePoint"),
      file_name: z.string().describe("File name in SharePoint"),
      local_file_path: z.string().describe("Absolute path to local file"),
    },
    async ({ folder_path, file_name, local_file_path }) =>
      handleToolError(async () => {
        const { graphClient, siteId } = getDefaultContext();
        const item = await uploadDocumentFromPath(
          graphClient,
          siteId,
          folder_path,
          file_name,
          local_file_path,
        );
        return toolResult(`Uploaded: ${item.name} (${item.size} bytes) - ${item.webUrl}`);
      }),
  );

  server.tool(
    "Update_Document",
    "Update an existing document's content in SharePoint",
    {
      file_path: z.string().describe("Path to the file to update"),
      content: z.string().describe("New file content (text or base64-encoded)"),
      encoding: z.enum(["text", "base64"]).default("text").describe("Content encoding"),
    },
    async ({ file_path, content, encoding }) =>
      handleToolError(async () => {
        const { graphClient, siteId } = getDefaultContext();
        const buffer =
          encoding === "base64"
            ? Buffer.from(content, "base64")
            : Buffer.from(content, "utf-8");
        const item = await updateDocument(graphClient, siteId, file_path, buffer);
        return toolResult(`Updated: ${item.name} (${item.size} bytes)`);
      }),
  );

  server.tool(
    "Delete_Document",
    "Delete a document from SharePoint",
    {
      file_path: z.string().describe("Path to the file to delete"),
    },
    async ({ file_path }) =>
      handleToolError(async () => {
        const { graphClient, siteId } = getDefaultContext();
        await deleteDocument(graphClient, siteId, file_path);
        return toolResult(`Deleted: ${file_path}`);
      }),
  );
}
