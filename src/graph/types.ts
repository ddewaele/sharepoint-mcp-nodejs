export interface DriveItem {
  id: string;
  name: string;
  size?: number;
  webUrl?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  file?: { mimeType: string };
  folder?: { childCount: number };
  parentReference?: {
    driveId?: string;
    id?: string;
    path?: string;
  };
  "@microsoft.graph.downloadUrl"?: string;
}

export interface DriveItemCollection {
  value: DriveItem[];
  "@odata.nextLink"?: string;
}

export interface UploadSession {
  uploadUrl: string;
  expirationDateTime: string;
}

export interface Site {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
}

export interface TreeNode {
  name: string;
  type: "folder" | "file";
  size?: number;
  children?: TreeNode[];
}
