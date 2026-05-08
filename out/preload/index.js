"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  openFile: () => electron.ipcRenderer.invoke("dialog:openFile"),
  readFile: (filePath) => electron.ipcRenderer.invoke("readFile", filePath),
  onOpenFile: (cb) => {
    electron.ipcRenderer.on("open-file", (_e, path) => cb(path));
  },
  minimize: () => electron.ipcRenderer.send("window:minimize"),
  maximize: () => electron.ipcRenderer.send("window:maximize"),
  close: () => electron.ipcRenderer.send("window:close")
});
