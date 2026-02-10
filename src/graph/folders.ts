import type { GraphClient } from "./client.js";
import type { DriveItem, DriveItemCollection, TreeNode } from "./types.js";

function drivePath(siteId: string, folderPath?: string): string {
  const base = `/sites/${siteId}/drive`;
  if (!folderPath || folderPath === "/" || folderPath === "") {
    return `${base}/root/children`;
  }
  const clean = folderPath.replace(/^\/+|\/+$/g, "");
  return `${base}/root:/${clean}:/children`;
}

export async function listFolders(
  client: GraphClient,
  siteId: string,
  folderPath?: string,
): Promise<DriveItem[]> {
  const result = await client.request<DriveItemCollection>(
    drivePath(siteId, folderPath) + "?$filter=folder ne null",
  );
  return result.value;
}

export async function createFolder(
  client: GraphClient,
  siteId: string,
  parentPath: string,
  folderName: string,
): Promise<DriveItem> {
  const base = `/sites/${siteId}/drive`;
  let url: string;
  if (!parentPath || parentPath === "/" || parentPath === "") {
    url = `${base}/root/children`;
  } else {
    const clean = parentPath.replace(/^\/+|\/+$/g, "");
    url = `${base}/root:/${clean}:/children`;
  }

  return client.request<DriveItem>(url, {
    method: "POST",
    body: JSON.stringify({
      name: folderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "fail",
    }),
  });
}

export async function deleteFolder(
  client: GraphClient,
  siteId: string,
  folderPath: string,
): Promise<void> {
  const clean = folderPath.replace(/^\/+|\/+$/g, "");
  const url = `/sites/${siteId}/drive/root:/${clean}`;
  await client.request(url, { method: "DELETE" });
}

export async function getFolderTree(
  client: GraphClient,
  siteId: string,
  folderPath?: string,
  maxDepth: number = 3,
  currentDepth: number = 0,
): Promise<TreeNode[]> {
  if (currentDepth >= maxDepth) return [];

  const result = await client.request<DriveItemCollection>(
    drivePath(siteId, folderPath),
  );

  const nodes: TreeNode[] = [];
  for (const item of result.value) {
    if (item.folder) {
      const childPath = folderPath
        ? `${folderPath.replace(/\/+$/, "")}/${item.name}`
        : item.name;
      const children = await getFolderTree(
        client,
        siteId,
        childPath,
        maxDepth,
        currentDepth + 1,
      );
      nodes.push({ name: item.name, type: "folder", children });
    } else {
      nodes.push({ name: item.name, type: "file", size: item.size });
    }
  }
  return nodes;
}
