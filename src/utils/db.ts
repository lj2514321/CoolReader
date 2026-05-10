const DB_NAME = 'epub-reader'
const DB_VERSION = 4

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
}

export interface ProgressRecord {
  filePath: string
  progress: number
  updatedAt: number
}

export async function saveBook(book: BookRecord): Promise<void> {
  const db = await openDB()
  store(db, 'books', 'readwrite').put(book)
}

export async function deleteBook(filePath: string): Promise<void> {
  const db = await openDB()
  store(db, 'books', 'readwrite').delete(filePath)
  store(db, 'progress', 'readwrite').delete(filePath)
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
  updatedAt: number
}

export async function saveProgress(filePath: string, progress: number, cfi: string, index: number): Promise<void> {
  if (!cfi) console.warn('[saveProgress] cfi is empty, index:', index)
  const db = await openDB()
  store(db, 'progress', 'readwrite').put({
    filePath, progress, cfi, index,
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
