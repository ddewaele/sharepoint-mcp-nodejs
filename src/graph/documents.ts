import { readFile, stat } from "node:fs/promises";
import type { GraphClient } from "./client.js";
import type { DriveItem, DriveItemCollection, UploadSession } from "./types.js";

const SIMPLE_UPLOAD_MAX = 4 * 1024 * 1024; // 4MB
const CHUNK_SIZE = 3200 * 1024; // 3.2MB (320KB * 10)

function itemsPath(siteId: string, folderPath?: string): string {
  const base = `/sites/${siteId}/drive`;
  if (!folderPath || folderPath === "/" || folderPath === "") {
    return `${base}/root/children`;
  }
  const clean = folderPath.replace(/^\/+|\/+$/g, "");
  return `${base}/root:/${clean}:/children`;
}

export async function listDocuments(
  client: GraphClient,
  siteId: string,
  folderPath?: string,
): Promise<DriveItem[]> {
  const result = await client.request<DriveItemCollection>(
    itemsPath(siteId, folderPath) + "?$filter=file ne null",
  );
  return result.value;
}

export async function getDocumentContent(
  client: GraphClient,
  siteId: string,
  filePath: string,
): Promise<{ buffer: Buffer; item: DriveItem }> {
  const clean = filePath.replace(/^\/+|\/+$/g, "");
  const item = await client.request<DriveItem>(
    `/sites/${siteId}/drive/root:/${clean}`,
  );

  const downloadUrl = item["@microsoft.graph.downloadUrl"];
  if (!downloadUrl) {
    throw new Error("No download URL available for this file");
  }

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), item };
}

export async function uploadDocument(
  client: GraphClient,
  siteId: string,
  folderPath: string,
  fileName: string,
  content: Uint8Array,
): Promise<DriveItem> {
  const clean = folderPath.replace(/^\/+|\/+$/g, "");
  const parentPart = clean ? `root:/${clean}` : "root:";
  const url = `/sites/${siteId}/drive/${parentPart}/${fileName}:/content`;

  return client.request<DriveItem>(url, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: content as unknown as BodyInit,
  });
}

export async function uploadDocumentFromPath(
  client: GraphClient,
  siteId: string,
  folderPath: string,
  fileName: string,
  localFilePath: string,
): Promise<DriveItem> {
  const fileContent = await readFile(localFilePath);
  const fileSize = (await stat(localFilePath)).size;

  if (fileSize <= SIMPLE_UPLOAD_MAX) {
    return uploadDocument(client, siteId, folderPath, fileName, fileContent);
  }

  return resumableUpload(client, siteId, folderPath, fileName, fileContent, fileSize);
}

async function resumableUpload(
  client: GraphClient,
  siteId: string,
  folderPath: string,
  fileName: string,
  content: Uint8Array,
  fileSize: number,
): Promise<DriveItem> {
  const clean = folderPath.replace(/^\/+|\/+$/g, "");
  const parentPart = clean ? `root:/${clean}` : "root:";
  const sessionUrl = `/sites/${siteId}/drive/${parentPart}/${fileName}:/createUploadSession`;

  const session = await client.request<UploadSession>(sessionUrl, {
    method: "POST",
    body: JSON.stringify({
      item: {
        "@microsoft.graph.conflictBehavior": "replace",
        name: fileName,
      },
    }),
  });

  let offset = 0;
  let result: DriveItem | undefined;

  while (offset < fileSize) {
    const end = Math.min(offset + CHUNK_SIZE, fileSize);
    const chunk = content.subarray(offset, end);

    const response = await fetch(session.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": chunk.length.toString(),
        "Content-Range": `bytes ${offset}-${end - 1}/${fileSize}`,
      },
      body: chunk as unknown as BodyInit,
    });

    if (!response.ok) {
      throw new Error(`Upload chunk failed: ${response.statusText}`);
    }

    if (response.status === 200 || response.status === 201) {
      result = (await response.json()) as DriveItem;
    }

    offset = end;
  }

  if (!result) {
    throw new Error("Upload completed but no DriveItem returned");
  }
  return result;
}

export async function updateDocument(
  client: GraphClient,
  siteId: string,
  filePath: string,
  content: Uint8Array,
): Promise<DriveItem> {
  const clean = filePath.replace(/^\/+|\/+$/g, "");
  const url = `/sites/${siteId}/drive/root:/${clean}:/content`;

  return client.request<DriveItem>(url, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: content as unknown as BodyInit,
  });
}

export async function deleteDocument(
  client: GraphClient,
  siteId: string,
  filePath: string,
): Promise<void> {
  const clean = filePath.replace(/^\/+|\/+$/g, "");
  await client.request(`/sites/${siteId}/drive/root:/${clean}`, {
    method: "DELETE",
  });
}
