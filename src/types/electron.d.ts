// Electron API type declarations — addresses "Property electronAPI does not exist on type Window" errors

import type { WebDAVConfig, AIConfig, AIChatMessage, SyncResult, SyncProgressEvent } from './index'

interface ElectronAPI {
  openFile: () => Promise<string | null>
  readFile: (filePath: string) => Promise<Uint8Array>
  deleteFile: (filePath: string) => Promise<void>
  onOpenFile: (cb: (path: string) => void) => void
  minimize: () => void
  maximize: () => void
  close: () => void
  toggleFullscreen: () => void

  // WebDAV
  webdavTestConn: (config: WebDAVConfig) => Promise<SyncResult>
  webdavListFiles: (config: WebDAVConfig) => Promise<string[]>
  webdavUploadBook: (config: WebDAVConfig, localPath: string, fileName: string) => Promise<void>
  webdavDownloadBook: (config: WebDAVConfig, fileName: string, destPath: string) => Promise<void>
  webdavUploadProgress: (config: WebDAVConfig, fileName: string, data: string) => Promise<void>
  webdavDownloadProgress: (config: WebDAVConfig, fileName: string) => Promise<string>
  webdavUploadReadingTime: (config: WebDAVConfig, data: string) => Promise<void>
  webdavDownloadReadingTime: (config: WebDAVConfig) => Promise<string>
  webdavDeleteRemote: (config: WebDAVConfig, remotePath: string) => Promise<void>
  webdavSyncAll: (config: WebDAVConfig, localBooks: unknown[], localProgress: unknown[], localReadingTime: number) => Promise<SyncResult>
  onSyncProgress: (cb: (data: SyncProgressEvent) => void) => () => void

  // AI
  aiChat: (config: AIConfig, messages: AIChatMessage[]) => Promise<string>
  aiStream: (config: AIConfig, messages: AIChatMessage[]) => Promise<string>
  onAIToken: (cb: (token: string) => void) => () => void

  // Wallpaper
  selectWallpaper: () => Promise<{ error: string | null; data: string | null }>

  // Settings
  saveSetting: (key: string, value: string) => Promise<void>
  loadSetting: (key: string) => Promise<string | null>
}

interface Window {
  electronAPI?: ElectronAPI
}

// Electron's File interface includes path (not standard web File)
declare global {
  interface File {
    path?: string
  }
}