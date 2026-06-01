import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron'
import path from 'path'
import { promises as fs, existsSync } from 'fs'
import { logger } from '../../src/utils/logger'
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
import { IPC } from '../ipc-channels'

// 便携模式：数据目录跟随可执行文件
function setupPortableData() {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR
  if (portableDir) {
    const dataDir = path.join(portableDir, 'CoolReaderData')
    if (!existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
    app.setPath('userData', dataDir)
    app.setPath('appData', dataDir)
    return
  }
  const appImagePath = process.env.APPIMAGE
  if (appImagePath) {
    const dataDir = path.join(path.dirname(appImagePath), 'CoolReaderData')
    if (!existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
    app.setPath('userData', dataDir)
    app.setPath('appData', dataDir)
  }
}

setupPortableData()

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
    logger.info(`[main] loading dev: ${process.env.ELECTRON_RENDERER_URL}`)
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools()
    mainWindow.webContents.on('console-message', (_e, level, msg) => {
      logger.info(`[renderer] ${msg}`)
    })
  } else {
    logger.info('[main] loading fallback file')
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    logger.error(`[main] load failed: ${code} ${desc}`)
  })
}

ipcMain.on(IPC.window.minimize, () => mainWindow?.minimize())
ipcMain.on(IPC.window.maximize, () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on(IPC.window.close, () => mainWindow?.close())
ipcMain.on(IPC.window.toggleFullscreen, () => {
  if (mainWindow?.isFullScreen()) mainWindow.setFullScreen(false)
  else mainWindow?.setFullScreen(true)
})

ipcMain.handle(IPC.dialog.openFile, async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    filters: [{ name: 'EPUB', extensions: ['epub'] }],
    properties: ['openFile'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle(IPC.file.readFile, async (_e, filePath: string) => {
  logger.info('[main] readFile:', path.basename(filePath))
  const buf = await fs.readFile(filePath)
  logger.info('[main] readFile done, size:', buf.length)
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
})

ipcMain.handle(IPC.file.deleteFile, async (_e, filePath: string) => {
  await fs.unlink(filePath)
})

ipcMain.handle(IPC.webdav.testConn, async (_e, config) => {
  return testConnection(config)
})

ipcMain.handle(IPC.webdav.listFiles, async (_e, config) => {
  return listRemoteBooks(config)
})

ipcMain.handle(IPC.webdav.uploadBook, async (_e, config, localPath, fileName) => {
  await uploadBook(config, localPath, fileName)
})

ipcMain.handle(IPC.webdav.downloadBook, async (_e, config, fileName, destPath) => {
  await downloadBook(config, fileName, destPath)
})

ipcMain.handle(IPC.webdav.uploadProgress, async (_e, config, fileName, data) => {
  await uploadProgress(config, fileName, data)
})

ipcMain.handle(IPC.webdav.downloadProgress, async (_e, config, fileName) => {
  return downloadProgress(config, fileName)
})

ipcMain.handle(IPC.webdav.uploadReadingTime, async (_e, config, data) => {
  await uploadReadingTime(config, data)
})

ipcMain.handle(IPC.webdav.downloadReadingTime, async (_e, config) => {
  return downloadReadingTime(config)
})

ipcMain.handle(IPC.webdav.deleteRemote, async (_e, config, remotePath) => {
  await deleteRemoteFile(config, remotePath)
})

ipcMain.handle(IPC.webdav.syncAll, async (event, config, localBooks, localProgress, localReadingTime) => {
  const sendProgress = (data: any) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC.webdav.progress, data)
    }
  }
  return syncAll(config, localBooks, localProgress, localReadingTime, sendProgress)
})

ipcMain.handle(IPC.ai.chat, async (_e, config, messages) => {
  return callAI(config, messages)
})

ipcMain.handle(IPC.ai.stream, async (event, config, messages) => {
  const onToken = (token: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC.ai.token, token)
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
