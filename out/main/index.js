"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    background: "#0f0c29",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    console.log(`[main] loading dev: ${process.env.ELECTRON_RENDERER_URL}`);
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    console.log("[main] loading fallback file");
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  mainWindow.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error(`[main] load failed: ${code} ${desc}`);
  });
}
electron.ipcMain.on("window:minimize", () => mainWindow?.minimize());
electron.ipcMain.on("window:maximize", () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
electron.ipcMain.on("window:close", () => mainWindow?.close());
electron.ipcMain.handle("dialog:openFile", async () => {
  const result = await electron.dialog.showOpenDialog(mainWindow, {
    filters: [{ name: "EPUB", extensions: ["epub"] }],
    properties: ["openFile"]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});
electron.ipcMain.handle("readFile", async (_e, filePath) => {
  console.log("[main] readFile:", filePath);
  const buf = await fs.promises.readFile(filePath);
  console.log("[main] readFile done, size:", buf.length);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
});
electron.ipcMain.handle("deleteFile", async (_e, filePath) => {
  await fs.promises.unlink(filePath);
});
electron.app.whenReady().then(() => {
  electron.Menu.setApplicationMenu(null);
  createWindow();
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
});
