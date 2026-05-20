export const IPC = {
  window: {
    minimize: 'window:minimize',
    maximize: 'window:maximize',
    close: 'window:close',
    toggleFullscreen: 'window:toggleFullscreen',
  },
  dialog: {
    openFile: 'dialog:openFile',
  },
  file: {
    readFile: 'readFile',
    deleteFile: 'deleteFile',
  },
  openFile: 'open-file',
  webdav: {
    testConn: 'webdav:testConn',
    listFiles: 'webdav:listFiles',
    uploadBook: 'webdav:uploadBook',
    downloadBook: 'webdav:downloadBook',
    uploadProgress: 'webdav:uploadProgress',
    downloadProgress: 'webdav:downloadProgress',
    uploadReadingTime: 'webdav:uploadReadingTime',
    downloadReadingTime: 'webdav:downloadReadingTime',
    deleteRemote: 'webdav:deleteRemote',
    syncAll: 'webdav:syncAll',
    progress: 'webdav:progress',
  },
  ai: {
    chat: 'ai:chat',
    stream: 'ai:stream',
    token: 'ai:token',
  },
} as const
