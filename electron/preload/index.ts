import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  readFile: (filePath: string) => ipcRenderer.invoke('readFile', filePath),
  deleteFile: (filePath: string) => ipcRenderer.invoke('deleteFile', filePath),
  onOpenFile: (cb: (path: string) => void) => {
    ipcRenderer.on('open-file', (_e, path) => cb(path))
  },
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
})
