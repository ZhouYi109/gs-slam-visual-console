const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  getApiBase: () => ipcRenderer.invoke("app:get-api-base"),
  selectPath: (options) => ipcRenderer.invoke("dialog:select-path", options),
  openConvertWindow: () => ipcRenderer.invoke("window:open-convert"),
  getVersion: () => ipcRenderer.invoke("app:get-version"),
  restartAndInstall: () => ipcRenderer.invoke("app:restart-and-install"),
  checkForUpdates: () => ipcRenderer.invoke("app:check-for-updates")
});
