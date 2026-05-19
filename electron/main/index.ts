import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron'
import path from 'path'
import { promises as fs, existsSync } from 'fs'
import { callAI, streamAI } from './ai'
import {
  testConnection,
  listRemoteBooks,
  uploadBook,
  downloadBook,
  uploadProgress,
  downloadProgress,
  uploadReadingTime,
  downloadReadingTime,
  deleteRemoteFile,
  syncAll,
} from './webdav'

let mainWindow: BrowserWindow | null = null

function getIconPath(): string | undefined {
  const ico = path.join(__dirname, '../../coolreader_icon.ico')
  if (existsSync(ico)) return ico
  const png = path.join(__dirname, '../../coolreader_icon_256.png')
  if (existsSync(png)) return png
  return undefined
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    background: '#0f0c29',
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    console.log(`[main] loading dev: ${process.env.ELECTRON_RENDERER_URL}`)
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools()
    mainWindow.webContents.on('console-message', (_e, level, msg) => {
      console.log(`[renderer] ${msg}`)
    })
  } else {
    console.log('[main] loading fallback file')
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error(`[main] load failed: ${code} ${desc}`)
  })
}

ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window:close', () => mainWindow?.close())
ipcMain.on('window:toggleFullscreen', () => {
  if (mainWindow?.isFullScreen()) mainWindow.setFullScreen(false)
  else mainWindow?.setFullScreen(true)
})

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    filters: [{ name: 'EPUB', extensions: ['epub'] }],
    properties: ['openFile'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('readFile', async (_e, filePath: string) => {
  console.log('[main] readFile:', filePath)
  const buf = await fs.readFile(filePath)
  console.log('[main] readFile done, size:', buf.length)
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
})

ipcMain.handle('deleteFile', async (_e, filePath: string) => {
  await fs.unlink(filePath)
})

// ---- WebDAV IPC handlers ----

ipcMain.handle('webdav:testConn', async (_e, config) => {
  return testConnection(config)
})

ipcMain.handle('webdav:listFiles', async (_e, config) => {
  return listRemoteBooks(config)
})

ipcMain.handle('webdav:uploadBook', async (_e, config, localPath, fileName) => {
  await uploadBook(config, localPath, fileName)
})

ipcMain.handle('webdav:downloadBook', async (_e, config, fileName, destPath) => {
  await downloadBook(config, fileName, destPath)
})

ipcMain.handle('webdav:uploadProgress', async (_e, config, fileName, data) => {
  await uploadProgress(config, fileName, data)
})

ipcMain.handle('webdav:downloadProgress', async (_e, config, fileName) => {
  return downloadProgress(config, fileName)
})

ipcMain.handle('webdav:uploadReadingTime', async (_e, config, data) => {
  await uploadReadingTime(config, data)
})

ipcMain.handle('webdav:downloadReadingTime', async (_e, config) => {
  return downloadReadingTime(config)
})

ipcMain.handle('webdav:deleteRemote', async (_e, config, remotePath) => {
  await deleteRemoteFile(config, remotePath)
})

ipcMain.handle('webdav:syncAll', async (event, config, localBooks, localProgress, localReadingTime) => {
  const sendProgress = (data: any) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('webdav:progress', data)
    }
  }
  return syncAll(config, localBooks, localProgress, localReadingTime, sendProgress)
})

// ---- AI IPC handlers ----

ipcMain.handle('ai:chat', async (_e, config, messages) => {
  return callAI(config, messages)
})

ipcMain.handle('ai:stream', async (event, config, messages) => {
  const onToken = (token: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ai:token', token)
    }
  }
  return streamAI(config, messages, onToken)
})

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
