const DB_NAME = 'epub-reader'
const DB_VERSION = 1

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
}

export async function loadAllBooks(): Promise<BookRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = store(db, 'books').getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveProgress(filePath: string, progress: number): Promise<void> {
  const db = await openDB()
  store(db, 'progress', 'readwrite').put({
    filePath,
    progress,
    updatedAt: Date.now(),
  })
}

export async function loadProgress(filePath: string): Promise<number> {
  const db = await openDB()
  return new Promise((resolve) => {
    const req = store(db, 'progress').get(filePath)
    req.onsuccess = () => resolve(req.result?.progress ?? 0)
    req.onerror = () => resolve(0)
  })
}
