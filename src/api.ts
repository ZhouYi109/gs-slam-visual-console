import type { DatasetInspection } from "./types";

let baseUrl: string | undefined;

async function getBaseUrl() {
  if (!baseUrl) {
    if (window.desktop && typeof window.desktop.getApiBase === "function") {
      baseUrl = await window.desktop.getApiBase();
    } else {
      baseUrl = "http://127.0.0.1:8000";
    }
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
  return request<{status: string, taskId?: string}>("/api/convert/bag_to_folder", {
    method: "POST",
    body: JSON.stringify(req)
  });
}

export function getConvertStatus(taskId: string) {
  return request<{status: "processing" | "success" | "failed", message: string}>(`/api/convert/status?taskId=${taskId}`);
}

export function convertFolderToBag(req: import("./types").ConvertFolderToBagRequest) {
  return request<{status: string, taskId?: string}>("/api/convert/folder_to_bag", {
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

export function testLidarHardware(ip: string, port: string, brand: string) {
  return request<{ success: boolean; msg: string }>("/api/hardware/test_lidar", {
    method: "POST",
    body: JSON.stringify({ ip, port, brand })
  });
}

export function testImuHardware(port: string, baud: string) {
  return request<{ success: boolean; msg: string }>("/api/hardware/test_imu", {
    method: "POST",
    body: JSON.stringify({ port, baud })
  });
}

export function testCameraHardware(mode: string, input: string, res: string, fps: string) {
  return request<{ success: boolean; msg: string }>("/api/hardware/test_camera", {
    method: "POST",
    body: JSON.stringify({ mode, input, res, fps })
  });
}

export async function getGitHubReleases(): Promise<any[]> {
  const response = await fetch("https://api.github.com/repos/ZhouYi109/gs-slam-visual-console/releases");
  if (!response.ok) {
    throw new Error(`获取 GitHub Releases 失败：${response.status}`);
  }
  return await response.json();
}

export function findLaunches(req: { host?: string; port?: number; username?: string; password?: string; projectPath?: string }) {
  return request<{ success: boolean; paths: string[] }>("/api/server/find_launches", {
    method: "POST",
    body: JSON.stringify(req)
  });
}

export async function listRemoteDir(req: { host?: string; port?: number; username?: string; password?: string; dirPath: string }) {
  const base = await getBaseUrl();
  const params = new URLSearchParams({
    host: req.host || "",
    port: String(req.port || 22),
    username: req.username || "",
    password: req.password || "",
    dirPath: req.dirPath
  });
  const res = await fetch(`${base}/api/server/list_remote_dir?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to list remote directory: ${res.statusText}`);
  }
  return (await res.json()) as { success: boolean; files: string[] };
}

export async function getRemoteFileUrl(req: { host?: string; port?: number; username?: string; password?: string; filePath: string }) {
  const base = await getBaseUrl();
  const params = new URLSearchParams({
    host: req.host || "",
    port: String(req.port || 22),
    username: req.username || "",
    password: req.password || "",
    filePath: req.filePath
  });
  return `${base}/api/server/get_remote_file?${params.toString()}`;
}

export async function getDatasetFiles(path: string) {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/dataset/get_files?path=${encodeURIComponent(path)}`);
  if (!res.ok) {
    throw new Error(`Failed to read dataset directory: ${res.statusText}`);
  }
  return (await res.json()) as { success: boolean; images: string[]; lidars: string[]; imu: string[][] };
}

export async function getLocalFileUrl(path: string) {
  const base = await getBaseUrl();
  return `${base}/api/dataset/file?path=${encodeURIComponent(path)}`;
}


