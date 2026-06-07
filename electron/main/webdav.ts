import { createClient, type WebDAVClient } from 'webdav'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import type { WebDAVConfig, BookFormat } from '../../src/types'

interface RemoteBook {
  fileName: string
  lastMod: string
  format: BookFormat
}

interface BookProgress {
  title: string
  author: string
  progress: number
  cfi: string
  /** Universal position string. For epub: CFI. For txt/mobi: 'chapterIdx:charOffset' */
  location: string
  index: number
  format?: BookFormat
  updatedAt: number
}

interface ReadingTimeData {
  [date: string]: number
}

const SUPPORTED_EXTS = ['epub', 'txt', 'mobi', 'azw3', 'prc'] as const

function detectFormatFromName(fileName: string): BookFormat | null {
  const ext = fileName.toLowerCase().split('.').pop() || ''
  if (ext === 'epub') return 'epub'
  if (ext === 'txt') return 'txt'
  if (ext === 'mobi' || ext === 'azw3' || ext === 'prc') return 'mobi'
  return null
}

/** Strip extension and return basename. T12: format-agnostic. */
function baseName(fileName: string): string {
  return path.basename(fileName, path.extname(fileName))
}

function createWebDAVClient(config: WebDAVClient | WebDAVConfig): WebDAVClient {
  if ('username' in config) {
    return createClient((config as WebDAVConfig).url, {
      username: (config as WebDAVConfig).username,
      password: (config as WebDAVConfig).password,
    })
  }
  return config as WebDAVClient
}

function booksDir(c: WebDAVConfig) { return `${c.path}/books`.replace(/\/+/g, '/') }
function progressDir(c: WebDAVConfig) { return `${c.path}/progress`.replace(/\/+/g, '/') }
function readingTimePath(c: WebDAVConfig) { return `${c.path}/readingTime.json`.replace(/\/+/g, '/') }

/** T12: progress files live under format/<format>/<basename>.json to avoid cross-format collisions. */
function progressPath(c: WebDAVConfig, format: BookFormat, base: string): string {
  return `${progressDir(c)}/${format}/${base}.json`.replace(/\/+/g, '/')
}

async function ensureDir(client: WebDAVClient, dir: string) {
  try {
    await client.getDirectoryContents(dir)
  } catch {
    await client.createDirectory(dir, { recursive: true })
  }
}

export async function testConnection(config: WebDAVConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const client = createWebDAVClient(config)
    await client.getDirectoryContents('/')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) }
  }
}

export async function listRemoteBooks(config: WebDAVConfig): Promise<RemoteBook[]> {
  const client = createWebDAVClient(config)
  const dir = booksDir(config)
  try {
    const items = await client.getDirectoryContents(dir) as any[]
    return items
      .filter((i: any) => {
        if (i.type !== 'file') return false
        const ext = (i.filename || '').toLowerCase().split('.').pop() || ''
        return (SUPPORTED_EXTS as readonly string[]).includes(ext)
      })
      .map((i: any) => ({
        fileName: path.basename(i.filename),
        lastMod: i.lastmod || '',
        format: detectFormatFromName(i.filename) || 'epub',
      }))
  } catch {
    return []
  }
}

export async function uploadBook(config: WebDAVConfig, localPath: string, fileName: string): Promise<void> {
  const client = createWebDAVClient(config)
  await ensureDir(client, booksDir(config))
  const buf = await fs.readFile(localPath)
  const remotePath = `${booksDir(config)}/${fileName}`
  await client.putFileContents(remotePath, buf, { overwrite: true })
}

export async function downloadBook(config: WebDAVConfig, fileName: string, destPath: string): Promise<void> {
  const client = createWebDAVClient(config)
  const remotePath = `${booksDir(config)}/${fileName}`
  const buf = await client.getFileContents(remotePath) as ArrayBuffer
  await fs.writeFile(destPath, Buffer.from(buf))
}

export async function uploadProgress(config: WebDAVConfig, fileName: string, data: BookProgress): Promise<void> {
  const client = createWebDAVClient(config)
  const format = data.format || detectFormatFromName(fileName) || 'epub'
  const remotePath = progressPath(config, format, baseName(fileName))
  await ensureDir(client, `${progressDir(config)}/${format}`)
  await client.putFileContents(remotePath, JSON.stringify(data), { overwrite: true })
}

export async function downloadProgress(config: WebDAVConfig, fileName: string): Promise<BookProgress | null> {
  const client = createWebDAVClient(config)
  const format = detectFormatFromName(fileName) || 'epub'
  const remotePath = progressPath(config, format, baseName(fileName))
  try {
    const buf = await client.getFileContents(remotePath) as ArrayBuffer
    const text = new TextDecoder().decode(buf)
    const parsed = JSON.parse(text) as BookProgress
    // Backward compat: existing remote files may lack format/location
    if (!parsed.format) parsed.format = format
    if (!parsed.location) parsed.location = parsed.cfi || ''
    return parsed
  } catch {
    return null
  }
}

export async function uploadReadingTime(config: WebDAVConfig, data: ReadingTimeData): Promise<void> {
  const client = createWebDAVClient(config)
  await ensureDir(client, config.path)
  await client.putFileContents(readingTimePath(config), JSON.stringify(data), { overwrite: true })
}

export async function downloadReadingTime(config: WebDAVConfig): Promise<ReadingTimeData | null> {
  const client = createWebDAVClient(config)
  try {
    const buf = await client.getFileContents(readingTimePath(config)) as ArrayBuffer
    const text = new TextDecoder().decode(buf)
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function deleteRemoteFile(config: WebDAVConfig, remotePath: string): Promise<void> {
  const client = createWebDAVClient(config)
  await client.deleteFile(remotePath)
}

export async function syncAll(
  config: WebDAVConfig,
  localBooks: { filePath: string; title: string; author: string; cover?: string; format?: BookFormat }[],
  localProgress: { filePath: string; progress: number; cfi: string; location?: string; index: number; format?: BookFormat; updatedAt: number }[],
  localReadingTime: { date: string; seconds: number }[],
  onProgress: (event: { phase: string; message: string; current?: number; total?: number }) => void,
): Promise<{ success: boolean; uploaded: number; downloaded: number; conflicts: number; errors: string[] }> {
  const result = { success: true, uploaded: 0, downloaded: 0, conflicts: 0, errors: [] as string[] }

  try {
    // 1. List remote books
    onProgress({ phase: 'list', message: '获取远程书籍列表...' })
    const remoteBooks = await listRemoteBooks(config)

    // 2. Upload local-only books
    const localFiles = new Set(localBooks.map(b => path.basename(b.filePath)))
    const remoteFiles = new Set(remoteBooks.map(b => b.fileName))

    const toUpload = localBooks.filter(b => !remoteFiles.has(path.basename(b.filePath)))
    const toDownload = [...remoteFiles].filter(f => !localFiles.has(f))

    onProgress({ phase: 'upload', message: `上传 ${toUpload.length} 本书...`, total: toUpload.length, current: 0 })
    for (let i = 0; i < toUpload.length; i++) {
      const book = toUpload[i]
      const fileName = path.basename(book.filePath)
      try {
        await uploadBook(config, book.filePath, fileName)
        result.uploaded++
        onProgress({ phase: 'upload', message: `已上传: ${book.title}`, current: i + 1, total: toUpload.length })
      } catch (err: any) {
        result.errors.push(`上传失败 ${fileName}: ${err.message}`)
      }
    }

    // 3. Download remote-only books
    onProgress({ phase: 'download', message: `下载 ${toDownload.length} 本书...`, total: toDownload.length, current: 0 })
    for (let i = 0; i < toDownload.length; i++) {
      const fileName = toDownload[i]
      const destPath = path.join(os.homedir(), 'Downloads', fileName)
      try {
        await downloadBook(config, fileName, destPath)
        result.downloaded++
        onProgress({ phase: 'download', message: `已下载: ${fileName}`, current: i + 1, total: toDownload.length })
      } catch (err: any) {
        result.errors.push(`下载失败 ${fileName}: ${err.message}`)
      }
    }

    // 4. Sync progress (two-way, take newer by updatedAt). T12: format-aware keys
    onProgress({ phase: 'progress', message: '同步阅读进度...' })
    // Build local progress map keyed by "<format>/<baseName>"
    const localProgressMap = new Map<string, typeof localProgress[number]>()
    for (const p of localProgress) {
      const fmt = p.format || detectFormatFromName(p.filePath) || 'epub'
      const key = `${fmt}/${baseName(p.filePath)}`
      localProgressMap.set(key, p)
    }
    for (const rb of remoteBooks) {
      const fmt = rb.format
      const key = `${fmt}/${baseName(rb.fileName)}`
      try {
        const remoteProg = await downloadProgress(config, rb.fileName)
        const localProg = localProgressMap.get(key)

        if (remoteProg && localProg) {
          if (remoteProg.updatedAt > localProg.updatedAt) {
            // remote is newer — would need to save locally (handled by renderer)
            result.conflicts++
          } else if (localProg.updatedAt > remoteProg.updatedAt) {
            // local is newer — upload
            const book = localBooks.find(b => baseName(b.filePath) === baseName(rb.fileName) && (b.format || detectFormatFromName(b.filePath)) === fmt)
            await uploadProgress(config, rb.fileName, {
              title: book?.title || '',
              author: book?.author || '',
              progress: localProg.progress,
              cfi: localProg.cfi,
              location: localProg.location || localProg.cfi,
              index: localProg.index,
              format: fmt,
              updatedAt: localProg.updatedAt,
            })
          }
        } else if (remoteProg && !localProg) {
          // Remote progress exists but no local — downloaded books will need this applied
          result.conflicts++
        } else if (!remoteProg && localProg) {
          await uploadProgress(config, rb.fileName, {
            title: localBooks.find(b => b.filePath === localProg.filePath)?.title || '',
            author: localBooks.find(b => b.filePath === localProg.filePath)?.author || '',
            progress: localProg.progress,
            cfi: localProg.cfi,
            location: localProg.location || localProg.cfi,
            index: localProg.index,
            format: fmt,
            updatedAt: localProg.updatedAt,
          })
        }
      } catch (err: any) {
        result.errors.push(`进度同步失败 ${rb.fileName}: ${err.message}`)
      }
    }

    // 5. Sync reading time (merge: take max per date)
    onProgress({ phase: 'readingTime', message: '同步阅读时长...' })
    try {
      const remoteRT = await downloadReadingTime(config)
      const merged: ReadingTimeData = {}
      // start with remote
      if (remoteRT) Object.assign(merged, remoteRT)
      // merge local (take max)
      for (const r of localReadingTime) {
        merged[r.date] = Math.max(merged[r.date] || 0, r.seconds)
      }
      await uploadReadingTime(config, merged)
    } catch (err: any) {
      result.errors.push(`阅读时长同步失败: ${err.message}`)
    }

    onProgress({ phase: 'done', message: '同步完成' })
  } catch (err: any) {
    result.success = false
    result.errors.push(`同步异常: ${err.message}`)
  }

  return result
}
