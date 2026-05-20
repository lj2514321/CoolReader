import { useState, useCallback, useEffect, useRef } from 'react'
import { Library } from './components/Library'
import { Reader } from './components/Reader'
import { Sidebar } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { useEpub } from './hooks/useEpub'
import { useDragDrop } from './hooks/useDragDrop'
import { useProgressTimer } from './hooks/useProgressTimer'
import { useInitialLoad } from './hooks/useInitialLoad'
import { BookEntry, ThemeMode, Page, WebDAVConfig, AIConfig } from './types'
import { saveBook, saveCover, saveProgress, deleteBook as dbDeleteBook, updateLastOpenedAt } from './utils/db'

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
      toggleFullscreen: () => void
      webdavTestConn: (config: any) => Promise<{ success: boolean; error?: string }>
      webdavListFiles: (config: any) => Promise<any[]>
      webdavUploadBook: (config: any, localPath: string, fileName: string) => Promise<void>
      webdavDownloadBook: (config: any, fileName: string, destPath: string) => Promise<void>
      webdavUploadProgress: (config: any, fileName: string, data: any) => Promise<void>
      webdavDownloadProgress: (config: any, fileName: string) => Promise<any>
      webdavUploadReadingTime: (config: any, data: any) => Promise<void>
      webdavDownloadReadingTime: (config: any) => Promise<any>
      webdavDeleteRemote: (config: any, remotePath: string) => Promise<void>
      webdavSyncAll: (config: any, localBooks: any, localProgress: any, localReadingTime: any) => Promise<any>
      onSyncProgress: (cb: (data: any) => void) => () => void
      aiChat: (config: any, messages: any) => Promise<any>
      aiStream: (config: any, messages: any) => Promise<any>
      onAIToken: (cb: (token: string) => void) => () => void
    }
  }
}

const _styleId = '_app_drag'
if (typeof document !== 'undefined' && !document.getElementById(_styleId)) {
  const s = document.createElement('style')
  s.id = _styleId
  s.textContent = '.titlebar-drag{-webkit-app-region:drag}.titlebar-no-drag{-webkit-app-region:no-drag}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}'
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
  const { meta, toc, theme, progress, progressRef, cfiRef, indexRef, sectionHrefRef, extractMeta, openBook, initReadingTime, setTheme, setCustomTheme, goNext, goPrev, goToHref, goToCfi, seekTo, getReadingSeconds, saveReadingTime, resizeViewer, destroy, getChapterText, getFullBookText, layout, updateLayout, bookmarks, highlights, selectionInfo, currentCfi, toggleBookmark, removeBookmarkById, addHighlight, removeHighlight, clearSelection, searchText, navigateToSearchResult, getChapterLabel, customThemeRef } = useEpub()
  const [bgGradient, setBgGradient] = useState('linear-gradient(135deg, #0a0a1a 0%, #1a1040 40%, #0d1137 100%)')
  const [webdavConfig, setWebdavConfig] = useState<WebDAVConfig | null>(null)
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null)

  const doImport = useCallback(async (filePath: string) => {
    if (!filePath) return
    if (books.some((b) => b.filePath === filePath)) return
    try {
      const result = await extractMeta(filePath)
      const { coverData, ...meta } = result
      const lastOpenedAt = Date.now()
      setBooks((prev) => [...prev, { filePath, meta, lastOpenedAt }])
      saveBook({ filePath, title: meta.title, author: meta.author, lastOpenedAt })
      if (coverData) saveCover(filePath, coverData, meta.coverMime)
    } catch (err) {
      setError(String(err))
    }
  }, [books, extractMeta])

  const { isDragging, toast, handleDragOver, handleDragLeave, handleDrop } = useDragDrop(page, doImport)

  useInitialLoad({
    onBooksLoaded: setBooks,
    initReadingTime,
    setReadingTime,
    onWebDAVConfig: setWebdavConfig,
    onAIConfig: setAiConfig,
  })

  useProgressTimer({
    currentBook,
    page,
    indexRef,
    cfiRef,
    progressRef,
    getChapterLabel,
    saveReadingTime,
    getReadingSeconds,
    setReadingTime,
  })

  const importRef = useRef(doImport)
  importRef.current = doImport

  useEffect(() => {
    window.electronAPI?.onOpenFile((path) => importRef.current(path))
  }, [])

  useEffect(() => {
    return () => destroy()
  }, [destroy])

  useEffect(() => {
    const handleUnload = () => { if (currentBook) saveReadingTime() }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [currentBook, saveReadingTime])

  const handleOpenBook = useCallback((filePath: string) => {
    console.log('[App] handleOpenBook called:', filePath)
    setCurrentBook(filePath)
    updateLastOpenedAt(filePath)
    setBooks((prev) => prev.map((b) =>
      b.filePath === filePath ? { ...b, lastOpenedAt: Date.now() } : b
    ))
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
    const label = getChapterLabel(idx)
    if (currentBook) {
      saveProgress(currentBook, pct, cfi, idx, label)
      setBooks(prev => prev.map(b =>
        b.filePath === currentBook ? { ...b, progress: pct, chapterLabel: label } : b
      ))
    }
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
  }, [currentBook, destroy, saveReadingTime, getReadingSeconds, getChapterLabel])

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

  const handleWebDAVConfigChange = useCallback((config: WebDAVConfig | null) => {
    setWebdavConfig(config)
  }, [])

  const handleAIConfigChange = useCallback((config: AIConfig | null) => {
    setAiConfig(config)
  }, [])

  const isLibrary = page === 'library'
  const opacity = phase === 'idle' ? 1 : phase === 'leaving' ? 0 : 1
  const scale = phase === 'idle' ? 1 : phase === 'leaving' ? 0.97 : 1
  const activeTocSrc = sectionHrefRef.current

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        display: 'flex', flexDirection: 'column', height: '100vh',
        background: isLibrary ? bgGradient : ({ light: '#ece8f4', sepia: '#f4ecd8', dark: '#0a0a1a' } satisfies Record<ThemeMode, string>)[theme],
        transition: 'background 0.3s ease',
        position: 'relative',
      }}>
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
          <Library books={books} readingTime={readingTime} onOpenBook={handleOpenBook} onImport={handleImport} onDelete={handleDeleteBook} onBgChange={setBgGradient} webdavConfig={webdavConfig} onWebDAVConfigChange={handleWebDAVConfigChange} aiConfig={aiConfig} onAIConfigChange={handleAIConfigChange} />
        </div>
        <div style={{
          position: 'absolute', inset: 0,
          visibility: isLibrary ? 'hidden' : 'visible',
          opacity: !isLibrary ? opacity : 0,
          transform: `scale(${!isLibrary ? 1 : phase === 'entering' ? scale : 1})`,
          transition: 'opacity 0.25s ease, transform 0.25s ease, visibility 0.25s ease',
          pointerEvents: !isLibrary ? 'auto' : 'none',
        }}>
          <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {sidebarOpen && (
              <Sidebar
                toc={toc}
                activeHref={activeTocSrc}
                onNavigate={async (href) => {
                  setSidebarOpen(false)
                  await goToHref(href)
                }}
                onClose={() => setSidebarOpen(false)}
                theme={theme}
              />
            )}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Reader
                filePath={currentBook}
                meta={meta}
                theme={theme}
                layout={layout}
                customTheme={customThemeRef.current}
                onLayoutChange={updateLayout}
                onLoad={openBook}
                onBack={handleBack}
                onNext={goNext}
                onPrev={goPrev}
                onToggleSidebar={() => setSidebarOpen(v => !v)}
                progress={progress}
                onSeek={seekTo}
                onThemeChange={setTheme}
                onCustomThemeChange={setCustomTheme}
                onResize={resizeViewer}
                aiConfig={aiConfig}
                onGetChapterText={getChapterText}
                onGetFullBookText={getFullBookText}
                bookmarks={bookmarks}
                highlights={highlights}
                currentCfi={currentCfi}
                selectionInfo={selectionInfo}
                onToggleBookmark={toggleBookmark}
                onRemoveBookmark={removeBookmarkById}
                onAddHighlight={addHighlight}
                onRemoveHighlight={removeHighlight}
                onClearSelection={clearSelection}
                onGoToCfi={goToCfi}
                onSearch={searchText}
                onNavigateToSearchResult={navigateToSearchResult}
              />
            </div>
          </div>
        </div>
      </div>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 10000,
          background: 'rgba(220,38,38,0.9)', backdropFilter: 'blur(12px)',
          padding: '12px 24px', borderRadius: 12,
          color: '#fff', fontSize: 13, fontWeight: 500,
          maxWidth: 400, textAlign: 'center',
          animation: 'fadeIn 0.2s ease',
        }}>{toast}</div>
      )}
      {isDragging && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(99,102,241,0.15)',
          backdropFilter: 'blur(8px) saturate(120%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 16,
        }}>
          <div style={{ fontSize: 56, opacity: 0.7 }}>📖</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', opacity: 0.8 }}>释放以导入 EPUB 文件</div>
        </div>
      )}
    </div>
  )
}
