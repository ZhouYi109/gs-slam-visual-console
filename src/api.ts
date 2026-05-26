import type { DatasetInspection } from "./types";

let baseUrl: string | undefined;

async function getBaseUrl() {
  if (!baseUrl) {
    baseUrl = await window.desktop.getApiBase();
  }
  return baseUrl;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${await getBaseUrl()}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {})
    },
    ...options
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export function inspectDataset(sourcePath: string) {
  return request<DatasetInspection>("/api/dataset/inspect", {
    method: "POST",
    body: JSON.stringify({ sourcePath })
  });
}

export function convertBagToFolder(req: import("./types").ConvertBagToFolderRequest) {
  return request<{status: string, message: string}>("/api/convert/bag_to_folder", {
    method: "POST",
    body: JSON.stringify(req)
  });
}

export function convertFolderToBag(req: import("./types").ConvertFolderToBagRequest) {
  return request<{status: string, message: string}>("/api/convert/folder_to_bag", {
    method: "POST",
    body: JSON.stringify(req)
  });
}

export function testConnection(req: import("./types").TestConnectionRequest) {
  return request<import("./types").TestConnectionResponse>("/api/server/test_connection", {
    method: "POST",
    body: JSON.stringify(req)
  });
}

export function exportBridge(destPath: string) {
  return request<{ success: boolean; message: string }>("/api/server/export_bridge", {
    method: "POST",
    body: JSON.stringify({ destPath })
  });
}
