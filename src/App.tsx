import { useState, useCallback, useEffect, useRef } from 'react'
import { Library } from './components/Library'
import { Reader } from './components/Reader'
import { Sidebar } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { useEpub } from './hooks/useEpub'
import { BookEntry } from './types'
import { saveBook, loadAllBooks, saveProgress, deleteBook as dbDeleteBook, loadReadingTime } from './utils/db'

type Page = 'library' | 'reader'

declare global {
  interface Window {
    electronAPI?: {
      openFile: () => Promise<string | null>
      readFile: (path: string) => Promise<any>
      deleteFile: (path: string) => Promise<void>
      onOpenFile: (cb: (path: string) => void) => void
      minimize: () => void
      maximize: () => void
      close: () => void
    }
  }
}

const _styleId = '_app_drag'
if (typeof document !== 'undefined' && !document.getElementById(_styleId)) {
  const s = document.createElement('style')
  s.id = _styleId
  s.textContent = '.titlebar-drag{-webkit-app-region:drag}.titlebar-no-drag{-webkit-app-region:no-drag}'
  document.head.appendChild(s)
}

export default function App() {
  const [page, setPage] = useState<Page>('library')
  const [phase, setPhase] = useState<'idle' | 'entering' | 'leaving'>('idle')
  const [books, setBooks] = useState<BookEntry[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentBook, setCurrentBook] = useState<string | null>(null)
  const [readingTime, setReadingTime] = useState(0)
  const { meta, toc, theme, progress, progressRef, cfiRef, indexRef, sectionHrefRef, extractMeta, openBook, setTheme, goNext, goPrev, goToHref, seekTo, getReadingSeconds, saveReadingTime, destroy } = useEpub()

  // save progress + CFI + index every 2s, update reading time
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentBook && progressRef.current > 0) {
        saveProgress(currentBook, progressRef.current, cfiRef.current, indexRef.current)
      }
      saveReadingTime()
      setReadingTime(getReadingSeconds())
    }, 2000)
    return () => clearInterval(interval)
  }, [currentBook, progressRef, cfiRef, indexRef, saveReadingTime, getReadingSeconds])
  // load books + reading time from IndexedDB on mount
  useEffect(() => {
    loadAllBooks().then((records) => {
      const entries: BookEntry[] = records.map((r) => ({
        filePath: r.filePath,
        meta: { title: r.title, author: r.author, cover: r.cover },
      }))
      setBooks(entries)
    }).catch(() => {})
    loadReadingTime(new Date().toISOString().slice(0, 10)).then(setReadingTime).catch(() => {})
  }, [])

  const handleOpenBook = useCallback((filePath: string) => {
    setCurrentBook(filePath)
    setPhase('leaving')
    setTimeout(() => {
      setPage('reader')
      setPhase('entering')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase('idle'))
      })
    }, 200)
  }, [])

  const handleBack = useCallback(() => {
    const pct = progressRef.current
    const cfi = cfiRef.current
    const idx = indexRef.current
    if (currentBook && pct > 0) saveProgress(currentBook, pct, cfi, idx)
    saveReadingTime()
    setReadingTime(getReadingSeconds())
    setPhase('leaving')
    setTimeout(() => {
      destroy()
      setSidebarOpen(false)
      setCurrentBook(null)
      setPage('library')
      setPhase('entering')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase('idle'))
      })
    }, 200)
  }, [currentBook, destroy, saveReadingTime, getReadingSeconds])

  const doImport = useCallback(async (filePath: string) => {
    if (!filePath) return
    if (books.some((b) => b.filePath === filePath)) return
    try {
      const meta = await extractMeta(filePath)
      setBooks((prev) => [...prev, { filePath, meta }])
      saveBook({ filePath, title: meta.title, author: meta.author, cover: meta.cover })
    } catch (err) {
      setError(String(err))
    }
  }, [books, extractMeta])

  const handleImport = useCallback(async () => {
    const filePath = await window.electronAPI?.openFile()
    if (!filePath) return
    doImport(filePath)
  }, [doImport])

  const handleDeleteBook = useCallback(async (filePath: string, deleteFile: boolean) => {
    setBooks((prev) => prev.filter((b) => b.filePath !== filePath))
    dbDeleteBook(filePath)
    if (deleteFile) {
      try {
        await window.electronAPI?.deleteFile(filePath)
      } catch (err) {
        setError(String(err))
      }
    }
  }, [])

  const importRef = useRef(doImport)
  importRef.current = doImport

  useEffect(() => {
    window.electronAPI?.onOpenFile((path) => importRef.current(path))
  }, [])

  useEffect(() => {
    return () => destroy()
  }, [destroy])

  const isLibrary = page === 'library'
  const opacity = phase === 'idle' ? 1 : phase === 'leaving' ? 0 : 1
  const scale = phase === 'idle' ? 1 : phase === 'leaving' ? 0.97 : 1
  const activeTocSrc = sectionHrefRef.current

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TitleBar />
      {error && (
        <div style={{
          background: 'rgba(220,38,38,0.85)', backdropFilter: 'blur(8px)',
          padding: '8px 20px', color: '#fff', fontSize: 13, fontWeight: 600,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>错误: {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 16 }}>✕</button>
        </div>
      )}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          opacity: isLibrary ? opacity : 0,
          transform: `scale(${isLibrary ? 1 : phase === 'entering' ? scale : 1})`,
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          pointerEvents: isLibrary ? 'auto' : 'none',
        }}>
          <Library books={books} readingTime={readingTime} onOpenBook={handleOpenBook} onImport={handleImport} onDelete={handleDeleteBook} />
        </div>
        <div style={{
          position: 'absolute', inset: 0,
          opacity: !isLibrary ? opacity : 0,
          transform: `scale(${!isLibrary ? 1 : phase === 'entering' ? scale : 1})`,
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          pointerEvents: !isLibrary ? 'auto' : 'none',
        }}>
          {/* reader content */}
          <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {sidebarOpen && (
              <Sidebar
                toc={toc}
                activeHref={activeTocSrc}
                onNavigate={(href) => { goToHref(href); setSidebarOpen(false) }}
                onClose={() => setSidebarOpen(false)}
              />
            )}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Reader
                filePath={currentBook}
                meta={meta}
                theme={theme}
                onLoad={openBook}
                onBack={handleBack}
                onNext={goNext}
                onPrev={goPrev}
                onToggleSidebar={() => setSidebarOpen(v => !v)}
                progress={progress}
                onSeek={seekTo}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
