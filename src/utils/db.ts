const DB_NAME = 'epub-reader'
const DB_VERSION = 6

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('books')) {
        db.createObjectStore('books', { keyPath: 'filePath' })
      }
      if (!db.objectStoreNames.contains('progress')) {
        db.createObjectStore('progress', { keyPath: 'filePath' })
      }
      if (!db.objectStoreNames.contains('readingTime')) {
        db.createObjectStore('readingTime', { keyPath: 'date' })
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('bookmarks')) {
        const bm = db.createObjectStore('bookmarks', { keyPath: 'id', autoIncrement: true })
        bm.createIndex('filePath', 'filePath', { unique: false })
        bm.createIndex('cfi', 'cfi', { unique: false })
      }
      if (!db.objectStoreNames.contains('highlights')) {
        const hl = db.createObjectStore('highlights', { keyPath: 'id', autoIncrement: true })
        hl.createIndex('filePath', 'filePath', { unique: false })
        hl.createIndex('cfiRange', 'cfiRange', { unique: false })
      }
      if (!db.objectStoreNames.contains('bookReadingTime')) {
        db.createObjectStore('bookReadingTime', { keyPath: ['filePath', 'date'] })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function store(db: IDBDatabase, name: string, mode: IDBTransactionMode = 'readonly') {
  return db.transaction(name, mode).objectStore(name)
}

export interface BookRecord {
  filePath: string
  title: string
  author: string
  cover?: string
  lastOpenedAt?: number
}

export async function saveBook(book: BookRecord): Promise<void> {
  const db = await openDB()
  store(db, 'books', 'readwrite').put(book)
}

export async function updateLastOpenedAt(filePath: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('books', 'readwrite')
  const req = tx.objectStore('books').get(filePath)
  req.onsuccess = () => {
    const record = req.result as BookRecord | undefined
    if (record) {
      record.lastOpenedAt = Date.now()
      tx.objectStore('books').put(record)
    }
  }
}

export async function deleteBook(filePath: string): Promise<void> {
  const db = await openDB()
  store(db, 'books', 'readwrite').delete(filePath)
  store(db, 'progress', 'readwrite').delete(filePath)
  const bmTx = db.transaction('bookmarks', 'readwrite')
  const bmIdx = bmTx.objectStore('bookmarks').index('filePath')
  bmIdx.getAll(filePath).onsuccess = (e) => {
    const records = (e.target as IDBRequest).result as Bookmark[]
    records.forEach(r => bmTx.objectStore('bookmarks').delete(r.id!))
  }
  const hlTx = db.transaction('highlights', 'readwrite')
  const hlIdx = hlTx.objectStore('highlights').index('filePath')
  hlIdx.getAll(filePath).onsuccess = (e) => {
    const records = (e.target as IDBRequest).result as Highlight[]
    records.forEach(r => hlTx.objectStore('highlights').delete(r.id!))
  }
}

export async function loadAllBooks(): Promise<BookRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = store(db, 'books').getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export interface ProgressRecord {
  filePath: string
  progress: number
  cfi: string
  index: number
  chapterLabel?: string
  updatedAt: number
}

export async function saveProgress(filePath: string, progress: number, cfi: string, index: number, chapterLabel?: string): Promise<void> {
  if (!cfi) console.warn('[saveProgress] cfi is empty, index:', index)
  const db = await openDB()
  store(db, 'progress', 'readwrite').put({
    filePath, progress, cfi, index, chapterLabel,
    updatedAt: Date.now(),
  })
}

export async function loadProgress(filePath: string): Promise<{ progress: number; cfi: string; index: number } | null> {
  const db = await openDB()
  return new Promise((resolve) => {
    const req = store(db, 'progress').get(filePath)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => resolve(null)
  })
}

export async function loadAllProgress(): Promise<ProgressRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = store(db, 'progress').getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export interface ReadingTimeRecord {
  date: string
  seconds: number
}

export async function saveReadingTime(date: string, seconds: number): Promise<void> {
  const db = await openDB()
  store(db, 'readingTime', 'readwrite').put({ date, seconds })
}

export async function loadReadingTime(date: string): Promise<number> {
  const db = await openDB()
  return new Promise((resolve) => {
    const req = store(db, 'readingTime').get(date)
    req.onsuccess = () => resolve(req.result?.seconds ?? 0)
    req.onerror = () => resolve(0)
  })
}

export async function loadReadingTimeRange(from: string, to: string): Promise<ReadingTimeRecord[]> {
  const db = await openDB()
  return new Promise((resolve) => {
    const req = store(db, 'readingTime').getAll()
    req.onsuccess = () => {
      const all = req.result as ReadingTimeRecord[]
      resolve(all.filter(r => r.date >= from && r.date <= to))
    }
    req.onerror = () => resolve([])
  })
}

export interface BookReadingTimeRecord {
  filePath: string
  date: string
  seconds: number
}

export async function saveBookReadingTime(filePath: string, date: string, seconds: number): Promise<void> {
  const db = await openDB()
  store(db, 'bookReadingTime', 'readwrite').put({ filePath, date, seconds })
}

export async function loadBookReadingTime(filePath: string, date: string): Promise<number> {
  const db = await openDB()
  return new Promise((resolve) => {
    const req = store(db, 'bookReadingTime').get([filePath, date])
    req.onsuccess = () => resolve(req.result?.seconds ?? 0)
    req.onerror = () => resolve(0)
  })
}

export async function loadAllBookReadingTime(): Promise<BookReadingTimeRecord[]> {
  const db = await openDB()
  return new Promise((resolve) => {
    const req = store(db, 'bookReadingTime').getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve([])
  })
}

export async function loadBookReadingTimeRange(from: string, to: string): Promise<BookReadingTimeRecord[]> {
  const db = await openDB()
  return new Promise((resolve) => {
    const req = store(db, 'bookReadingTime').getAll()
    req.onsuccess = () => {
      const all = req.result as BookReadingTimeRecord[]
      resolve(all.filter(r => r.date >= from && r.date <= to))
    }
    req.onerror = () => resolve([])
  })
}

import type { WebDAVConfig, AIConfig, Bookmark, Highlight } from '../types'

export async function saveWebDAVConfig(config: WebDAVConfig): Promise<void> {
  await saveSetting('webdavConfig', JSON.stringify(config))
}

export async function loadWebDAVConfig(): Promise<WebDAVConfig | null> {
  const raw = await loadSetting('webdavConfig')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  await saveSetting('aiConfig', JSON.stringify(config))
}

export async function loadAIConfig(): Promise<AIConfig | null> {
  const raw = await loadSetting('aiConfig')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const db = await openDB()
  store(db, 'settings', 'readwrite').put({ key, value })
}

export async function loadSetting(key: string): Promise<string | null> {
  const db = await openDB()
  return new Promise((resolve) => {
    const req = store(db, 'settings').get(key)
    req.onsuccess = () => resolve(req.result?.value ?? null)
    req.onerror = () => resolve(null)
  })
}

export async function addBookmark(bookmark: Omit<Bookmark, 'id'>): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = store(db, 'bookmarks', 'readwrite').add(bookmark)
    req.onsuccess = () => resolve(req.result as number)
    req.onerror = () => reject(req.error)
  })
}

export async function removeBookmark(id: number): Promise<void> {
  const db = await openDB()
  store(db, 'bookmarks', 'readwrite').delete(id)
}

export async function loadBookmarks(filePath: string): Promise<Bookmark[]> {
  const db = await openDB()
  return new Promise((resolve) => {
    const req = store(db, 'bookmarks').index('filePath').getAll(filePath)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve([])
  })
}

export async function isBookmarked(filePath: string, cfi: string): Promise<number | null> {
  const all = await loadBookmarks(filePath)
  const found = all.find(b => b.cfi === cfi)
  return found?.id ?? null
}

export async function addHighlight(hl: Omit<Highlight, 'id'>): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = store(db, 'highlights', 'readwrite').add(hl)
    req.onsuccess = () => resolve(req.result as number)
    req.onerror = () => reject(req.error)
  })
}

export async function removeHighlight(id: number): Promise<void> {
  const db = await openDB()
  store(db, 'highlights', 'readwrite').delete(id)
}

export async function loadHighlights(filePath: string): Promise<Highlight[]> {
  const db = await openDB()
  return new Promise((resolve) => {
    const req = store(db, 'highlights').index('filePath').getAll(filePath)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve([])
  })
}
