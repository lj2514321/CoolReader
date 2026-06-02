import { contextBridge, ipcRenderer, type Electron } from 'electron'
import { IPC } from '../ipc-channels'
import type { WebDAVConfig, AIConfig, AIChatMessage, SyncProgressEvent } from '../src/types'

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

  webdavTestConn: (config: WebDAVConfig) => ipcRenderer.invoke(IPC.webdav.testConn, config),
  webdavListFiles: (config: WebDAVConfig) => ipcRenderer.invoke(IPC.webdav.listFiles, config),
  webdavUploadBook: (config: WebDAVConfig, localPath: string, fileName: string) => ipcRenderer.invoke(IPC.webdav.uploadBook, config, localPath, fileName),
  webdavDownloadBook: (config: WebDAVConfig, fileName: string, destPath: string) => ipcRenderer.invoke(IPC.webdav.downloadBook, config, fileName, destPath),
  webdavUploadProgress: (config: WebDAVConfig, fileName: string, data: string) => ipcRenderer.invoke(IPC.webdav.uploadProgress, config, fileName, data),
  webdavDownloadProgress: (config: WebDAVConfig, fileName: string) => ipcRenderer.invoke(IPC.webdav.downloadProgress, config, fileName),
  webdavUploadReadingTime: (config: WebDAVConfig, data: string) => ipcRenderer.invoke(IPC.webdav.uploadReadingTime, config, data),
  webdavDownloadReadingTime: (config: WebDAVConfig) => ipcRenderer.invoke(IPC.webdav.downloadReadingTime, config),
  webdavDeleteRemote: (config: WebDAVConfig, remotePath: string) => ipcRenderer.invoke(IPC.webdav.deleteRemote, config, remotePath),
  webdavSyncAll: (config: WebDAVConfig, localBooks: unknown[], localProgress: unknown[], localReadingTime: number) => ipcRenderer.invoke(IPC.webdav.syncAll, config, localBooks, localProgress, localReadingTime),
  onSyncProgress: (cb: (data: SyncProgressEvent) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, d: SyncProgressEvent) => cb(d)
    ipcRenderer.on(IPC.webdav.progress, handler)
    return () => ipcRenderer.removeListener(IPC.webdav.progress, handler)
  },

  aiChat: (config: AIConfig, messages: AIChatMessage[]) => ipcRenderer.invoke(IPC.ai.chat, config, messages),
  aiStream: (config: AIConfig, messages: AIChatMessage[]) => ipcRenderer.invoke(IPC.ai.stream, config, messages),
  onAIToken: (cb: (token: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, t: string) => cb(t)
    ipcRenderer.on(IPC.ai.token, handler)
    return () => ipcRenderer.removeListener(IPC.ai.token, handler)
  },

  selectWallpaper: () => ipcRenderer.invoke(IPC.wallpaper.select),
})
