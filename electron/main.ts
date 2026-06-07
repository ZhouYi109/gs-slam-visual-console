import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApiServer } from "./server.js";
import { spawn, type ChildProcess } from "node:child_process";

import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
let apiPort = 0;
let stopApi: (() => Promise<void>) | undefined;
let pythonBridge: ChildProcess | undefined;

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");
app.commandLine.appendSwitch("disable-gpu-sandbox");
app.commandLine.appendSwitch("disable-direct-composition");
app.commandLine.appendSwitch("disable-features", "VizDisplayCompositor,Vulkan,UseSkiaRenderer");
app.setPath("userData", path.join(os.homedir(), "AppData", "Roaming", "gs-slam-visual-console"));

async function createWindow() {
  const server = await createApiServer();
  apiPort = server.port;
  stopApi = server.close;

  const pythonScript = app.isPackaged 
    ? path.join(process.resourcesPath, "ros_bridge", "main.py")
    : path.join(__dirname, "../ros_bridge/main.py");
    
  const logFile = path.join(app.getPath("userData"), "ros_bridge.log");
  const logStream = fs.createWriteStream(logFile, { flags: "a" });

  pythonBridge = spawn("python", [pythonScript], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    cwd: path.dirname(pythonScript)
  });

  pythonBridge.stdout?.pipe(logStream, { end: false });
  pythonBridge.stderr?.pipe(logStream, { end: false });

  pythonBridge.on("error", (error) => {
    logStream.write(`[pythonBridge:error] ${error.message}\n`);
  });

  pythonBridge.on("exit", (code, signal) => {
    logStream.write(`[pythonBridge:exit] code=${code ?? "null"} signal=${signal ?? "null"}\n`);
    logStream.end();
  });

  const window = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1180,
    minHeight: 760,
    title: "SLAM-3DGS控制台",
    backgroundColor: "#f4f1ea",
    webPreferences: {
      preload: path.join(__dirname, "../electron/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  window.setMenu(null);

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL as string);
    return;
  }

  await window.loadFile(path.join(__dirname, "../dist/index.html"));
}

app.whenReady().then(createWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async (event) => {
  if (pythonBridge) {
    pythonBridge.kill();
    pythonBridge = undefined;
  }
  if (!stopApi) {
    return;
  }
  event.preventDefault();
  const close = stopApi;
  stopApi = undefined;
  await close();
  app.quit();
});

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { autoUpdater } = require("electron-updater");


// Configure autoUpdater log
autoUpdater.autoDownload = false; // We want to ask first
autoUpdater.logger = console;

ipcMain.handle("app:get-api-base", () => `http://127.0.0.1:${apiPort}`);
ipcMain.handle("app:get-version", () => app.getVersion());

// Trigger update download and automatic install relaunch
ipcMain.handle("app:restart-and-install", async () => {
  try {
    if (app.isPackaged) {
      // 1. Download updates if not yet downloaded
      await autoUpdater.downloadUpdate();
      // The update will trigger relaunch once download is finished
      return;
    }
  } catch (err) {
    console.error("Update install failed, falling back to relaunch", err);
  }
  app.relaunch();
  app.exit(0);
});

// Expose updater events to renderer via IPC
ipcMain.handle("app:check-for-updates", async (event) => {
  if (!app.isPackaged) {
    return { hasUpdate: false, version: app.getVersion() };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result && result.updateInfo) {
      const latestV = result.updateInfo.version;
      const currentV = app.getVersion();
      return {
        hasUpdate: latestV !== currentV,
        version: latestV,
        info: result.updateInfo
      };
    }
  } catch (err) {
    console.error("Failed to check for updates on GitHub", err);
  }
  return { hasUpdate: false, version: app.getVersion() };
});

autoUpdater.on("update-downloaded", () => {
  // Restart immediately upon successful download
  autoUpdater.quitAndInstall();
});

ipcMain.handle("dialog:select-path", async (event, options: { title?: string; mode?: "file" | "folder"; filters?: Electron.FileFilter[] }) => {
  const parent = BrowserWindow.fromWebContents(event.sender) ?? undefined;
  const dialogOptions: Electron.OpenDialogOptions = {
    title: options.title ?? "Select input",
    properties: options.mode === "folder" ? ["openDirectory", "createDirectory"] : ["openFile"],
    filters: options.filters
  };
  const result = parent ? await dialog.showOpenDialog(parent, dialogOptions) : await dialog.showOpenDialog(dialogOptions);

  return result.canceled ? null : result.filePaths[0] ?? null;
});

let convertWindow: BrowserWindow | null = null;

ipcMain.handle("window:open-convert", async () => {
  try {
    if (convertWindow) {
      // If already open, focus it
      if (!convertWindow.isDestroyed()) {
        convertWindow.focus();
        return true;
      }
    }
    convertWindow = new BrowserWindow({
      width: 980,
      height: 780,
      minWidth: 900,
      minHeight: 700,
      title: "格式转换 (ROS Bag ↔ 可视化文件夹)",
      backgroundColor: "#ffffff",
      webPreferences: {
        preload: path.join(__dirname, "../electron/preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    convertWindow.setMenu(null);
    convertWindow.on("closed", () => {
      convertWindow = null;
    });
    if (isDev) {
      await convertWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}?window=convert`);
      convertWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
      await convertWindow.loadFile(path.join(__dirname, "../dist/index.html"), {
        query: { window: "convert" }
      });
    }
    return true;
  } catch (e) {
    console.error("Failed to open convert window", e);
    return false;
  }
});
