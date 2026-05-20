import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../ipc-channels'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke(IPC.dialog.openFile),
  readFile: (filePath: string) => ipcRenderer.invoke(IPC.file.readFile, filePath),
  deleteFile: (filePath: string) => ipcRenderer.invoke(IPC.file.deleteFile, filePath),
  onOpenFile: (cb: (path: string) => void) => {
    ipcRenderer.on(IPC.openFile, (_e, path) => cb(path))
  },
  minimize: () => ipcRenderer.send(IPC.window.minimize),
  maximize: () => ipcRenderer.send(IPC.window.maximize),
  close: () => ipcRenderer.send(IPC.window.close),
  toggleFullscreen: () => ipcRenderer.send(IPC.window.toggleFullscreen),

  webdavTestConn: (config: any) => ipcRenderer.invoke(IPC.webdav.testConn, config),
  webdavListFiles: (config: any) => ipcRenderer.invoke(IPC.webdav.listFiles, config),
  webdavUploadBook: (config: any, localPath: string, fileName: string) => ipcRenderer.invoke(IPC.webdav.uploadBook, config, localPath, fileName),
  webdavDownloadBook: (config: any, fileName: string, destPath: string) => ipcRenderer.invoke(IPC.webdav.downloadBook, config, fileName, destPath),
  webdavUploadProgress: (config: any, fileName: string, data: any) => ipcRenderer.invoke(IPC.webdav.uploadProgress, config, fileName, data),
  webdavDownloadProgress: (config: any, fileName: string) => ipcRenderer.invoke(IPC.webdav.downloadProgress, config, fileName),
  webdavUploadReadingTime: (config: any, data: any) => ipcRenderer.invoke(IPC.webdav.uploadReadingTime, config, data),
  webdavDownloadReadingTime: (config: any) => ipcRenderer.invoke(IPC.webdav.downloadReadingTime, config),
  webdavDeleteRemote: (config: any, remotePath: string) => ipcRenderer.invoke(IPC.webdav.deleteRemote, config, remotePath),
  webdavSyncAll: (config: any, localBooks: any, localProgress: any, localReadingTime: any) => ipcRenderer.invoke(IPC.webdav.syncAll, config, localBooks, localProgress, localReadingTime),
  onSyncProgress: (cb: (data: any) => void) => {
    const handler = (_e: any, d: any) => cb(d)
    ipcRenderer.on(IPC.webdav.progress, handler)
    return () => ipcRenderer.removeListener(IPC.webdav.progress, handler)
  },

  aiChat: (config: any, messages: any) => ipcRenderer.invoke(IPC.ai.chat, config, messages),
  aiStream: (config: any, messages: any) => ipcRenderer.invoke(IPC.ai.stream, config, messages),
  onAIToken: (cb: (token: string) => void) => {
    const handler = (_e: any, t: string) => cb(t)
    ipcRenderer.on(IPC.ai.token, handler)
    return () => ipcRenderer.removeListener(IPC.ai.token, handler)
  },
})
