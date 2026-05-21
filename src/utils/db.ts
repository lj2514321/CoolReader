const DB_NAME = 'epub-reader'
const DB_VERSION = 8

let dbSingleton: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbSingleton) return dbSingleton
  dbSingleton = new Promise((resolve, reject) => {
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
      if (!db.objectStoreNames.contains('covers')) {
        db.createObjectStore('covers', { keyPath: 'filePath' })
      }
      if (db.objectStoreNames.contains('bookReadingTime') && !req.transaction!.objectStore('bookReadingTime').indexNames.contains('date')) {
        req.transaction!.objectStore('bookReadingTime').createIndex('date', 'date', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => { dbSingleton = null; reject(req.error) }
  })
  return dbSingleton
}

function store(db: IDBDatabase, name: string, mode: IDBTransactionMode = 'readonly') {
  return db.transaction(name, mode).objectStore(name)
}

function requestPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export interface BookRecord {
  filePath: string
  title: string
  author: string
  lastOpenedAt?: number
}

export async function saveBook(book: BookRecord): Promise<void> {
  const db = await openDB()
  await requestPromise(store(db, 'books', 'readwrite').put(book))
}

export async function updateLastOpenedAt(filePath: string): Promise<void> {
  const db = await openDB()
  const record = await requestPromise<BookRecord | undefined>(db.transaction('books', 'readonly').objectStore('books').get(filePath))
  if (record) {
    record.lastOpenedAt = Date.now()
    await requestPromise(db.transaction('books', 'readwrite').objectStore('books').put(record))
  }
}

export async function deleteBook(filePath: string): Promise<void> {
  const db = await openDB()
  await Promise.all([
    requestPromise(store(db, 'books', 'readwrite').delete(filePath)),
    requestPromise(store(db, 'progress', 'readwrite').delete(filePath)),
    (async () => {
      const bmRecords = await requestPromise<Bookmark[]>(db.transaction('bookmarks', 'readonly').objectStore('bookmarks').index('filePath').getAll(filePath))
      if (bmRecords.length > 0) {
        const bmTx = db.transaction('bookmarks', 'readwrite')
        await Promise.all(bmRecords.map(r => requestPromise(bmTx.objectStore('bookmarks').delete(r.id!))))
      }
    })(),
    (async () => {
      const hlRecords = await requestPromise<Highlight[]>(db.transaction('highlights', 'readonly').objectStore('highlights').index('filePath').getAll(filePath))
      if (hlRecords.length > 0) {
        const hlTx = db.transaction('highlights', 'readwrite')
        await Promise.all(hlRecords.map(r => requestPromise(hlTx.objectStore('highlights').delete(r.id!))))
      }
    })(),
    requestPromise(store(db, 'covers', 'readwrite').delete(filePath)),
  ])
}

export async function loadAllBooks(): Promise<BookRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = store(db, 'books').getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function loadLastOpenedBook(): Promise<BookRecord | null> {
  const all = await loadAllBooks()
  if (all.length === 0) return null
  return all.reduce((best, b) =>
    !best.lastOpenedAt || (b.lastOpenedAt && b.lastOpenedAt > best.lastOpenedAt) ? b : best,
    all[0]
  )
}

export interface CoverRecord {
  filePath: string
  data: ArrayBuffer
  mime?: string
}

export async function saveCover(filePath: string, data: ArrayBuffer, mime?: string): Promise<void> {
  const db = await openDB()
  await requestPromise(store(db, 'covers', 'readwrite').put({ filePath, data, mime }))
}

export async function loadCover(filePath: string): Promise<CoverRecord | undefined> {
  const db = await openDB()
  return new Promise((resolve) => {
    const req = store(db, 'covers').get(filePath)
    req.onsuccess = () => resolve(req.result ?? undefined)
    req.onerror = () => resolve(undefined)
  })
}

export async function deleteCover(filePath: string): Promise<void> {
  const db = await openDB()
  await requestPromise(store(db, 'covers', 'readwrite').delete(filePath))
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
  await requestPromise(store(db, 'progress', 'readwrite').put({
    filePath, progress, cfi, index, chapterLabel,
    updatedAt: Date.now(),
  }))
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
  await requestPromise(store(db, 'readingTime', 'readwrite').put({ date, seconds }))
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
    const range = IDBKeyRange.bound(from, to)
    const req = store(db, 'readingTime').getAll(range)
    req.onsuccess = () => resolve(req.result as ReadingTimeRecord[])
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
  await requestPromise(store(db, 'bookReadingTime', 'readwrite').put({ filePath, date, seconds }))
}

export async function loadBookReadingTime(filePath: string, date: string): Promise<number> {
  const db = await openDB()
  return new Promise((resolve) => {
    const req = store(db, 'bookReadingTime').get([filePath, date])
    req.onsuccess = () => resolve(req.result?.seconds ?? 0)
    req.onerror = () => resolve(0)
  })
}

export async function loadBookReadingTimeRange(from: string, to: string): Promise<BookReadingTimeRecord[]> {
  const db = await openDB()
  return new Promise((resolve) => {
    const range = IDBKeyRange.bound(from, to)
    const req = db.transaction('bookReadingTime', 'readonly').objectStore('bookReadingTime').index('date').getAll(range)
    req.onsuccess = () => resolve(req.result as BookReadingTimeRecord[])
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
  await requestPromise(store(db, 'settings', 'readwrite').put({ key, value }))
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
  await requestPromise(store(db, 'bookmarks', 'readwrite').delete(id))
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
  await requestPromise(store(db, 'highlights', 'readwrite').delete(id))
}

export async function loadHighlights(filePath: string): Promise<Highlight[]> {
  const db = await openDB()
  return new Promise((resolve) => {
    const req = store(db, 'highlights').index('filePath').getAll(filePath)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve([])
  })
}
