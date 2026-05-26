import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("desktop", {
  getApiBase: () => ipcRenderer.invoke("app:get-api-base") as Promise<string>,
  selectPath: (options: unknown) => ipcRenderer.invoke("dialog:select-path", options) as Promise<string | null>,
  openConvertWindow: () => ipcRenderer.invoke("window:open-convert") as Promise<boolean>,
  getVersion: () => ipcRenderer.invoke("app:get-version") as Promise<string>,
  restartAndInstall: () => ipcRenderer.invoke("app:restart-and-install") as Promise<void>,
  checkForUpdates: () => ipcRenderer.invoke("app:check-for-updates") as Promise<{ hasUpdate: boolean; version: string }>
});
