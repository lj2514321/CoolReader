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

  // WebDAV
  webdavTestConn: (config: any) => ipcRenderer.invoke('webdav:testConn', config),
  webdavListFiles: (config: any) => ipcRenderer.invoke('webdav:listFiles', config),
  webdavUploadBook: (config: any, localPath: string, fileName: string) => ipcRenderer.invoke('webdav:uploadBook', config, localPath, fileName),
  webdavDownloadBook: (config: any, fileName: string, destPath: string) => ipcRenderer.invoke('webdav:downloadBook', config, fileName, destPath),
  webdavUploadProgress: (config: any, fileName: string, data: any) => ipcRenderer.invoke('webdav:uploadProgress', config, fileName, data),
  webdavDownloadProgress: (config: any, fileName: string) => ipcRenderer.invoke('webdav:downloadProgress', config, fileName),
  webdavUploadReadingTime: (config: any, data: any) => ipcRenderer.invoke('webdav:uploadReadingTime', config, data),
  webdavDownloadReadingTime: (config: any) => ipcRenderer.invoke('webdav:downloadReadingTime', config),
  webdavDeleteRemote: (config: any, remotePath: string) => ipcRenderer.invoke('webdav:deleteRemote', config, remotePath),
  webdavSyncAll: (config: any, localBooks: any, localProgress: any, localReadingTime: any) => ipcRenderer.invoke('webdav:syncAll', config, localBooks, localProgress, localReadingTime),
  onSyncProgress: (cb: (data: any) => void) => {
    const handler = (_e: any, d: any) => cb(d)
    ipcRenderer.on('webdav:progress', handler)
    return () => ipcRenderer.removeListener('webdav:progress', handler)
  },

  // AI
  aiChat: (config: any, messages: any) => ipcRenderer.invoke('ai:chat', config, messages),
  aiStream: (config: any, messages: any) => ipcRenderer.invoke('ai:stream', config, messages),
  onAIToken: (cb: (token: string) => void) => {
    const handler = (_e: any, t: string) => cb(t)
    ipcRenderer.on('ai:token', handler)
    return () => ipcRenderer.removeListener('ai:token', handler)
  },
})
