import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Library } from './components/Library'
import { Reader } from './components/Reader'
import { Sidebar } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { BookOpen, X } from 'lucide-react'
import { useEpub } from './hooks/useEpub'
import { useDragDrop } from './hooks/useDragDrop'
import { useProgressTimer } from './hooks/useProgressTimer'
import { useInitialLoad } from './hooks/useInitialLoad'
import { useTheme, setThemeOnRoot } from './styles/useTheme'
import './styles/theme.css'
import { BookEntry, ThemeMode, Page, WebDAVConfig, AIConfig, CustomBgConfig } from './types'
import { defGrad, flatDefGrad } from './utils/styles'
import { saveBook, saveCover, saveProgress, deleteBook as dbDeleteBook, updateLastOpenedAt, loadSetting, saveSetting } from './utils/db'
/// <reference types="./types/electron" />

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
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(null), 5000)
    return () => clearTimeout(t)
  }, [error])
  const [currentBook, setCurrentBook] = useState<string | null>(null)
  const [readingTime, setReadingTime] = useState(0)
  const { meta, toc, theme, progress, progressRef, cfiRef, indexRef, sectionHrefRef, extractMeta, openBook, initReadingTime, setTheme, setCustomTheme, setAnimationMode, setReducedMotion, goNext, goPrev, goToHref, goToCfi, seekTo, getReadingSeconds, saveReadingTime, resizeViewer, destroy, getChapterText, getFullBookText, layout, updateLayout, bookmarks, highlights, selectionInfo, currentCfi, toggleBookmark, removeBookmarkById, addHighlight, removeHighlight, clearSelection, searchText, navigateToSearchResult, getChapterLabel, customThemeRef } = useEpub()
  const { theme: uiTheme, setTheme: setUiTheme } = useTheme()
  useEffect(() => { setThemeOnRoot(uiTheme) }, [uiTheme])
  const [bgByTheme, setBgByTheme] = useState<Record<string, string>>({ glass: defGrad, flat: flatDefGrad })
  const uiThemeRef = useRef(uiTheme)
  useEffect(() => { uiThemeRef.current = uiTheme }, [uiTheme])
  const [customBgConfig, setCustomBgConfig] = useState<CustomBgConfig | null>(null)
  const [customBgLoaded, setCustomBgLoaded] = useState(false)
  useEffect(() => {
    loadSetting('customBg').then(v => {
      if (v) {
        try {
          const parsed = JSON.parse(v)
          setCustomBgConfig(parsed)
        } catch { /* corrupted — ignore */ }
      }
      setCustomBgLoaded(true)
    }).catch(() => setCustomBgLoaded(true))
  }, [])
  const handleBgChange = useCallback((g: string) => {
    setBgByTheme(prev => ({ ...prev, [uiThemeRef.current]: g }))
  }, [])
  const handleCustomBgChange = useCallback((config: CustomBgConfig) => {
    setCustomBgConfig(config)
    try {
      saveSetting('customBg', JSON.stringify(config))
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        setError('存储空间不足，无法保存自定义背景')
      } else {
        setError('保存失败')
      }
    }
  }, [])
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

  const handleOpenBook = useCallback((filePath: string) => {
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

  useInitialLoad({
    onBooksLoaded: setBooks,
    initReadingTime,
    setReadingTime,
    onWebDAVConfig: setWebdavConfig,
    onAIConfig: setAiConfig,
    onAutoOpenBook: handleOpenBook,
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
  // @ts-expect-error 'custom' theme is handled separately via customThemeRef, not in the base theme object
  const readerBg = ({ light: '#f7f4ed', sepia: '#f4ecd8', dark: '#1a1a1f' } satisfies Record<ThemeMode, string>)[theme]
  const appBg = useMemo(() => {
    if (customBgLoaded && customBgConfig && customBgConfig.type !== 'preset') {
      if (customBgConfig.type === 'color') {
        return customBgConfig.color || ''
      }
      if (customBgConfig.type === 'image' && customBgConfig.imageData) {
        return `url(${customBgConfig.imageData}) center/cover no-repeat`
      }
      if (customBgConfig.type === 'gradient' && customBgConfig.gradient) {
        const g = customBgConfig.gradient
        if (g.type === 'solid' && g.color) return g.color
        if (g.type === 'gradient' && g.gradientStops?.length) {
          const stops = g.gradientStops.map(s => `${s.color} ${s.position}%`).join(', ')
          if (g.gradientType === 'radial') {
            return `radial-gradient(ellipse at center, ${stops})`
          }
          return `linear-gradient(${g.gradientAngle ?? 135}deg, ${stops})`
        }
      }
    }
    return isLibrary ? bgByTheme[uiTheme] : readerBg
  }, [isLibrary, uiTheme, bgByTheme, customBgConfig, customBgLoaded, readerBg])
  const customBgStyle = customBgConfig?.type === 'image' && customBgConfig.imageData
    ? {
        backgroundImage: `url(${customBgConfig.imageData})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        transition: 'opacity 0.3s ease',
        opacity: 1,
      }
    : {}

  return (
    <div
      data-ui-theme={uiTheme}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        display: 'flex', flexDirection: 'column', height: '100vh',
        background: appBg,
        transition: 'background 0.3s ease, opacity 0.3s ease',
        position: 'relative',
        ...customBgStyle,
      }}>
      <TitleBar />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          opacity: isLibrary ? opacity : 0,
          transform: `scale(${isLibrary ? 1 : phase === 'entering' ? scale : 1})`,
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          pointerEvents: isLibrary ? 'auto' : 'none',
        }}>
          <Library uiTheme={uiTheme} books={books} readingTime={readingTime} onOpenBook={handleOpenBook} onImport={handleImport} onDelete={handleDeleteBook} onBgChange={handleBgChange} onCustomBgChange={handleCustomBgChange} webdavConfig={webdavConfig} onWebDAVConfigChange={handleWebDAVConfigChange} aiConfig={aiConfig} onAIConfigChange={handleAIConfigChange} />
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
            <div className={`sidebar-shell${sidebarOpen ? ' sidebar-shell-open' : ''}`}>
              <Sidebar
                toc={toc}
                activeHref={activeTocSrc}
                onNavigate={async (href) => {
                  setSidebarOpen(false)
                  await goToHref(href)
                }}
                onClose={() => setSidebarOpen(false)}
                theme={theme}
                open={sidebarOpen}
              />
            </div>
            <div className={`reader-stage${sidebarOpen ? ' reader-stage-shifted' : ''}`} style={{ flex: 1, overflow: 'hidden' }}>
              <Reader
                filePath={currentBook}
                meta={meta}
                theme={theme}
                layout={layout}
                customTheme={customThemeRef.current}
                onLayoutChange={updateLayout}
                onAnimationModeChange={setAnimationMode}
                onReducedMotionChange={setReducedMotion}
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
      {(error || toast) && (
        <div className="app-toast" style={{
          position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 10000,
          background: 'rgba(220,38,38,0.9)', backdropFilter: 'blur(12px)',
          padding: '12px 24px', borderRadius: 12,
          color: '#fff', fontSize: 13, fontWeight: 500,
          maxWidth: 400, textAlign: 'center',
          animation: 'fadeIn 0.2s ease',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>{error ? `错误: ${error}` : toast}</span>
          {error && <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0 }}><X size={14} /></button>}
        </div>
      )}
      {isDragging && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(45,90,90,0.15)',
          backdropFilter: 'blur(8px) saturate(120%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 16,
        }}>
          <div style={{ fontSize: 56, opacity: 0.7 }}><BookOpen size={56} /></div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', opacity: 0.8 }}>释放以导入电子书文件</div>
        </div>
      )}
    </div>
  )
}
