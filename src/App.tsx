import { useState, useCallback, useEffect, useRef } from 'react'
import { Library } from './components/Library'
import { Reader } from './components/Reader'
import { Sidebar } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { useEpub } from './hooks/useEpub'
import { BookEntry } from './types'
import { saveBook, loadAllBooks, saveProgress, loadProgress } from './utils/db'

type Page = 'library' | 'reader'

declare global {
  interface Window {
    electronAPI?: {
      openFile: () => Promise<string | null>
      readFile: (path: string) => Promise<any>
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
  const { meta, toc, theme, progress, extractMeta, openBook, setTheme, goNext, goPrev, goToHref, seekTo, destroy } = useEpub()

  // save progress when it changes
  const progressRef = useRef(progress)
  progressRef.current = progress
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentBook && progressRef.current > 0) {
        saveProgress(currentBook, progressRef.current)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [currentBook])
  // load books from IndexedDB on mount
  useEffect(() => {
    loadAllBooks().then((records) => {
      const entries: BookEntry[] = records.map((r) => ({
        filePath: r.filePath,
        meta: { title: r.title, author: r.author, cover: r.cover },
      }))
      setBooks(entries)
    }).catch(() => {})
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
  }, [destroy])

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
          <Library books={books} onOpenBook={handleOpenBook} onImport={handleImport} />
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
                onThemeChange={setTheme}
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
