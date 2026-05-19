import { useEffect, useRef, useState, useMemo } from 'react'
import { BookMeta, ThemeMode, AIConfig, ReaderLayout, fontFamilies, defaultLayout, Bookmark, Highlight, highlightColors, SearchResult } from '../types'
import { AIPanel } from './AIPanel'

interface ReaderProps {
  filePath: string | null
  meta: BookMeta | null
  theme: ThemeMode
  layout: ReaderLayout
  onLayoutChange: (patch: Partial<ReaderLayout>) => void
  progress: number
  onLoad: (path: string) => void
  onBack: () => void
  onNext: () => void
  onPrev: () => void
  onToggleSidebar: () => void
  onThemeChange: (t: ThemeMode) => void
  onSeek: (pct: number) => void
  onResize?: () => void
  aiConfig?: AIConfig | null
  onGetChapterText?: () => Promise<string>
  onGetFullBookText?: () => Promise<string>
  bookmarks: Bookmark[]
  highlights: Highlight[]
  currentCfi: string
  selectionInfo: { text: string; cfiRange: string; bounds: { top: number; left: number; width: number; height: number } } | null
  onToggleBookmark: () => void
  onRemoveBookmark: (id: number) => void
  onAddHighlight: (color: string) => void
  onRemoveHighlight: (id: number, cfiRange: string) => void
  onClearSelection: () => void
  onGoToCfi: (cfi: string) => void
  onSearch: (query: string) => Promise<SearchResult[]>
  onNavigateToSearchResult: (result: SearchResult) => void
}

const themes: { key: ThemeMode; icon: string }[] = [
  { key: 'light', icon: '☀' },
  { key: 'sepia', icon: '☕' },
  { key: 'dark', icon: '◉' },
]

const themeBg: Record<ThemeMode, string> = {
  light: '#ece8f4',
  sepia: '#f4ecd8',
  dark: '#0a0a1a',
}

const rangeSliderStyle = { flex: 1, height: 4, accentColor: '#6366f1', cursor: 'pointer' as const }
const layoutStepBtn = { padding: '4px 10px', fontSize: 14, opacity: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 8 }

export function Reader({
  filePath, meta, theme, layout, onLayoutChange, progress, onLoad, onBack, onNext, onPrev, onToggleSidebar, onThemeChange, onSeek, onResize, aiConfig, onGetChapterText, onGetFullBookText, bookmarks, highlights, currentCfi, selectionInfo, onToggleBookmark, onRemoveBookmark, onAddHighlight, onRemoveHighlight, onClearSelection, onGoToCfi, onSearch, onNavigateToSearchResult,
}: ReaderProps) {
  const nextRef = useRef(onNext)
  const prevRef = useRef(onPrev)
  nextRef.current = onNext
  prevRef.current = onPrev

  const loadedRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!filePath) {
      loadedRef.current = false
      return
    }
    if (!loadedRef.current) {
      loadedRef.current = true
      onLoad(filePath)
    }
  }, [filePath, onLoad])

  // ResizeObserver — reflow viewer when container resizes (e.g. sidebar toggle)
  useEffect(() => {
    const el = containerRef.current
    if (!el || !onResize) return
    const ro = new ResizeObserver(() => onResize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [onResize])

  const [showUI, setShowUI] = useState(true)
  const [showLayout, setShowLayout] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [showMarkers, setShowMarkers] = useState(false)
  const [markerTab, setMarkerTab] = useState<'bookmarks' | 'highlights'>('bookmarks')
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [ctxBmId, setCtxBmId] = useState<number | null>(null)
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 })
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const flowRef = useRef(layout.flow)
  flowRef.current = layout.flow
  const showLayoutRef = useRef(showLayout)
  showLayoutRef.current = showLayout
  const showSearchRef = useRef(showSearch)
  showSearchRef.current = showSearch
  const showMarkersRef = useRef(showMarkers)
  showMarkersRef.current = showMarkers
  const showAIRef = useRef(showAI)
  showAIRef.current = showAI
  const bookmarkRef = useRef(onToggleBookmark)
  bookmarkRef.current = onToggleBookmark

  useEffect(() => {
    if (!ctxBmId) return
    const close = () => setCtxBmId(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [ctxBmId])
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()
  const wheelTimer = useRef<ReturnType<typeof setTimeout>>()

  const showControls = () => {
    setShowUI(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowUI(false), 3000)
  }

  useEffect(() => {
    showControls()
    return () => clearTimeout(hideTimer.current)
  }, [])

  useEffect(() => {
    const handler = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('[data-scroll]')) return
      // scroll mode: let native scroll handle wheel
      if (flowRef.current !== 'paginated') return
      e.preventDefault()
      if (wheelTimer.current) return
      wheelTimer.current = setTimeout(() => { wheelTimer.current = undefined }, 200)
      if (e.deltaY > 0) nextRef.current()
      else if (e.deltaY < 0) prevRef.current()
    }
    window.addEventListener('wheel', handler, { passive: false })
    return () => {
      window.removeEventListener('wheel', handler)
      clearTimeout(wheelTimer.current)
    }
  }, [])

  const handleViewerClick = (e: React.MouseEvent) => {
    const iframe = document.querySelector<HTMLIFrameElement>('#viewer iframe')
    if (iframe?.contentDocument) {
      const r = iframe.getBoundingClientRect()
      const el = iframe.contentDocument.elementFromPoint(e.clientX - r.left, e.clientY - r.top)
      const link = el?.closest('a')
      if (link?.getAttribute('href')) {
        link.click()
        return
      }
    }

    const x = e.clientX - e.currentTarget.getBoundingClientRect().left
    const w = e.currentTarget.getBoundingClientRect().width
    if (x < w * 0.22) { prevRef.current(); showControls(); return }
    if (x > w * 0.78) { nextRef.current(); showControls(); return }

    setShowUI(v => !v)
    clearTimeout(hideTimer.current)
  }

  useEffect(() => {
    setIsBookmarked(bookmarks.some(b => b.cfi === currentCfi))
  }, [bookmarks, currentCfi])

  useEffect(() => {
    if (!showMarkers) setShowAI(false)
  }, [showMarkers])

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus()
  }, [showSearch])

  const searchTimer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    setSearching(true)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      const r = await onSearch(searchQuery)
      setSearchResults(r)
      setSearching(false)
    }, 300)
    return () => clearTimeout(searchTimer.current)
  }, [searchQuery, onSearch])

  // window-level keyboard — works in both paginated and scroll mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowRight' || (e.key === ' ' && flowRef.current === 'paginated' && !e.shiftKey)) { e.preventDefault(); nextRef.current(); showControls(); return }
      if (e.key === 'ArrowLeft' || (e.key === ' ' && e.shiftKey)) { e.preventDefault(); prevRef.current(); showControls(); return }
      if (e.key === 'Escape') {
        if (showSearchRef.current) setShowSearch(false)
        else if (showLayoutRef.current) setShowLayout(false)
        else if (showMarkersRef.current) setShowMarkers(false)
        else if (showAIRef.current) setShowAI(false)
        showControls(); return
      }
      if ((e.key === 'f' || e.key === 'F') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setShowSearch(v => !v); showControls(); return }
      if ((e.key === 'b' || e.key === 'B') && !e.ctrlKey && !e.metaKey) { bookmarkRef.current(); showControls(); return }
      if (e.key === 'F11') { e.preventDefault(); window.electronAPI?.toggleFullscreen() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const closeTopPanel = () => {
    if (showSearch) setShowSearch(false)
    else if (showLayout) setShowLayout(false)
    else if (showMarkers) setShowMarkers(false)
    else if (showAI) setShowAI(false)
  }

  const dark = theme === 'dark'
  const fg = dark ? '#c8c8e0' : '#2d2b55'
  const glassStyle = useMemo(() => ({
    background: dark ? 'rgba(15,12,41,0.45)' : 'rgba(255,255,255,0.55)',
    backdropFilter: 'blur(20px) saturate(140%)',
    WebkitBackdropFilter: 'blur(20px) saturate(140%)',
  }), [dark])
  const btnStyle = useMemo(() => ({
    background: 'none', border: 'none', cursor: 'pointer' as const,
    color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 600 as const,
    opacity: 0.7, transition: 'all 0.15s ease',
  }), [fg])

  return (
    <div ref={containerRef} style={{ height: '100%', background: themeBg[theme], overflow: 'hidden', position: 'relative' }}>
      <div id="viewer" style={{ position: 'absolute', inset: 0 }} />
      <div
        onClick={handleViewerClick}
        onKeyDown={e => {
          if (e.key === ' ') e.preventDefault()
          if (e.key === 'Escape') { closeTopPanel(); showControls(); return }
          if (e.key === 'ArrowRight') { e.preventDefault(); nextRef.current() }
          if (e.key === 'ArrowLeft') { e.preventDefault(); prevRef.current() }
          showControls()
        }}
        tabIndex={0}
        style={{
          position: 'absolute', inset: 0, zIndex: 1, outline: 'none',
          pointerEvents: layout.flow === 'scrolled-doc' ? 'none' : undefined,
        }}
      />

      {/* top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '12px 16px',
        opacity: showUI || showLayout || showMarkers ? 1 : 0,
        pointerEvents: showUI || showLayout || showMarkers ? 'auto' : 'none',
        transition: 'opacity 0.3s ease',
        zIndex: 2,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          borderRadius: 14, padding: '8px 14px',
          ...glassStyle,
        }}>
          <button onClick={onBack} style={btnStyle}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
          >←&ensp;返回</button>
          <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {meta?.title || ''}
          </span>
          <button onClick={onToggleSidebar} style={btnStyle}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
          >目录</button>
          {themes.map(t => (
            <button key={t.key} onClick={(e) => { e.stopPropagation(); onThemeChange(t.key) }}
              style={{
                ...btnStyle,
                padding: '7px 10px',
                background: theme === t.key ? 'rgba(99,102,241,0.3)' : 'transparent',
                opacity: 1,
                fontWeight: theme === t.key ? 700 : 400,
              }}
            >{t.icon}</button>
          ))}
          <button onClick={(e) => { e.stopPropagation(); setShowLayout(v => !v); setShowMarkers(false); setShowAI(false) }}
            style={{
              ...btnStyle, padding: '7px 12px', opacity: 1,
              background: showLayout ? 'rgba(99,102,241,0.3)' : 'transparent',
            }}
          >Aa</button>
          <button onClick={(e) => { e.stopPropagation(); onToggleBookmark() }}
            style={{
              ...btnStyle, padding: '7px 12px', opacity: 1, fontSize: 16,
              background: isBookmarked ? 'rgba(99,102,241,0.3)' : 'transparent',
            }}
          >🔖</button>
          <button onClick={(e) => { e.stopPropagation(); setShowSearch(v => !v); setShowLayout(false); setShowMarkers(false); setShowAI(false) }}
            style={{
              ...btnStyle, padding: '7px 12px', opacity: 1, fontSize: 15,
              background: showSearch ? 'rgba(99,102,241,0.3)' : 'transparent',
            }}
          >🔍</button>
          <button onClick={(e) => { e.stopPropagation(); setShowMarkers(v => !v); setShowLayout(false); setShowAI(false) }}
            style={{
              ...btnStyle, padding: '7px 12px', opacity: 1,
              background: showMarkers ? 'rgba(99,102,241,0.3)' : 'transparent',
            }}
          >☰</button>
          <button onClick={(e) => { e.stopPropagation(); window.electronAPI?.toggleFullscreen() }}
            style={{ ...btnStyle, padding: '7px 10px', opacity: 1, fontSize: 14 }}
          >⛶</button>
        </div>
        {showLayout && (
          <div onClick={e => e.stopPropagation()} style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 16, zIndex: 10,
          width: 260,
          borderRadius: 14, padding: '16px 18px',
          ...glassStyle,
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: fg, opacity: 0.6, marginBottom: 6 }}>字号</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => onLayoutChange({ fontSize: Math.max(75, layout.fontSize - 10) })}
                style={{ ...btnStyle, padding: '4px 10px', fontSize: 14, opacity: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 8 }}>A−</button>
              <input type="range" min={75} max={200} value={layout.fontSize}
                onChange={e => onLayoutChange({ fontSize: Number(e.target.value) })}
                style={rangeSliderStyle} />
              <button onClick={() => onLayoutChange({ fontSize: Math.min(200, layout.fontSize + 10) })}
                style={{ ...btnStyle, padding: '4px 10px', fontSize: 14, opacity: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 8 }}>A+</button>
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, color: fg, opacity: 0.4, marginTop: 2 }}>{layout.fontSize}%</div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: fg, opacity: 0.6, marginBottom: 6 }}>字体</div>
            <select value={layout.fontFamily}
              onChange={e => onLayoutChange({ fontFamily: e.target.value })}
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 8,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                color: fg, fontSize: 12, cursor: 'pointer', outline: 'none',
              }}
            >
              {fontFamilies.map(f => (
                <option key={f.value} value={f.value} style={{ color: '#000' }}>{f.label}</option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: fg, opacity: 0.6, marginBottom: 6 }}>行距</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => onLayoutChange({ lineHeight: Math.max(1, +(layout.lineHeight - 0.2).toFixed(1)) })}
                style={{ ...btnStyle, padding: '4px 10px', fontSize: 14, opacity: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 8 }}>−</button>
              <input type="range" min={10} max={25} value={Math.round(layout.lineHeight * 10)}
                onChange={e => onLayoutChange({ lineHeight: Number(e.target.value) / 10 })}
                style={rangeSliderStyle} />
              <button onClick={() => onLayoutChange({ lineHeight: Math.min(2.5, +(layout.lineHeight + 0.2).toFixed(1)) })}
                style={{ ...btnStyle, padding: '4px 10px', fontSize: 14, opacity: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 8 }}>+</button>
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, color: fg, opacity: 0.4, marginTop: 2 }}>{layout.lineHeight.toFixed(1)}</div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: fg, opacity: 0.6, marginBottom: 6 }}>边距</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => onLayoutChange({ margin: Math.max(0, layout.margin - 5) })}
                style={{ ...btnStyle, padding: '4px 10px', fontSize: 14, opacity: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 8 }}>−</button>
              <input type="range" min={0} max={40} value={layout.margin}
                onChange={e => onLayoutChange({ margin: Number(e.target.value) })}
                style={rangeSliderStyle} />
              <button onClick={() => onLayoutChange({ margin: Math.min(40, layout.margin + 5) })}
                style={{ ...btnStyle, padding: '4px 10px', fontSize: 14, opacity: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 8 }}>+</button>
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, color: fg, opacity: 0.4, marginTop: 2 }}>{layout.margin}px</div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: fg, opacity: 0.6, marginBottom: 6 }}>翻页模式</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => onLayoutChange({ flow: 'paginated' })}
                style={{
                  flex: 1, padding: '6px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                  background: layout.flow === 'paginated' ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
                  border: layout.flow === 'paginated' ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  color: fg, fontWeight: layout.flow === 'paginated' ? 600 : 400, transition: 'all 0.15s',
                }}
              >📄 分页</button>
              <button onClick={() => onLayoutChange({ flow: 'scrolled-doc' })}
                style={{
                  flex: 1, padding: '6px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                  background: layout.flow === 'scrolled-doc' ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
                  border: layout.flow === 'scrolled-doc' ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  color: fg, fontWeight: layout.flow === 'scrolled-doc' ? 600 : 400, transition: 'all 0.15s',
                }}
              >📜 滚动</button>
            </div>
          </div>
        </div>
      )}

      {showSearch && (
        <div onClick={e => e.stopPropagation()} style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 16, zIndex: 10,
          width: 320,
          borderRadius: 14, padding: '12px 14px',
          ...glassStyle,
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input ref={searchInputRef} value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setShowSearch(false) }}
              placeholder="搜索全书..."
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                color: fg, outline: 'none',
              }}
            />
            {searching && <span style={{ fontSize: 12, color: fg, opacity: 0.5, alignSelf: 'center' }}>搜索中...</span>}
          </div>
          {searchResults.length > 0 && (
            <div style={{ fontSize: 11, color: fg, opacity: 0.5, padding: '0 4px' }}>找到 {searchResults.length} 处匹配</div>
          )}
          {searchQuery && searchResults.length === 0 && !searching && (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: fg, opacity: 0.4 }}>未找到匹配</div>
          )}
          <div data-scroll="true" style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {searchResults.map((r, idx) => (
              <div key={`${r.chapterIndex}-${r.matchIndex}`} onClick={() => onNavigateToSearchResult(r)}
                style={{
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ fontSize: 10, color: fg, opacity: 0.45, marginBottom: 3 }}>{r.chapterLabel}</div>
                <div style={{ fontSize: 12, color: fg, lineHeight: 1.4 }}>
                  {r.contextBefore ? (
                    <span style={{ opacity: 0.4 }}>...{r.contextBefore}</span>
                  ) : null}
                  <span style={{ background: 'rgba(255,213,0,0.35)', borderRadius: 2, padding: '0 1px' }}>{r.matchText}</span>
                  {r.contextAfter ? (
                    <span style={{ opacity: 0.4 }}>{r.contextAfter}...</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* bottom bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '12px 16px',
        opacity: showUI ? 1 : 0,
        pointerEvents: showUI ? 'auto' : 'none',
        transition: 'opacity 0.3s ease',
        zIndex: 2,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          borderRadius: 14, padding: '8px 16px',
          ...glassStyle,
        }}>
          <button onClick={onPrev} style={btnStyle}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
          >◂&ensp;上一页</button>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              onClick={e => {
                const r = e.currentTarget.getBoundingClientRect()
                onSeek(Math.round(((e.clientX - r.left) / r.width) * 100))
              }}
              style={{
                flex: 1, height: 5, borderRadius: 3,
                background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                cursor: 'pointer', overflow: 'hidden',
              }}
            >
              <div style={{
                width: `${progress}%`, height: '100%',
                background: `linear-gradient(90deg, ${dark ? '#6366f1' : '#6366f1'}, ${dark ? '#a855f7' : '#a855f7'})`,
                borderRadius: 3, transition: 'width 0.2s ease',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)',
                  width: 10, height: 10, borderRadius: '50%',
                  background: '#a855f7', boxShadow: '0 0 6px rgba(168,85,247,0.5)',
                  opacity: 0.6,
                }} />
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: fg, opacity: 0.5, minWidth: 32, textAlign: 'right' }}>{progress}%</span>
          </div>

          <button onClick={onNext} style={btnStyle}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
          >下一页&ensp;▸</button>
        </div>
      </div>

      {/* selection toolbar */}
      {selectionInfo && (
        <div style={{
          position: 'absolute', zIndex: 20, pointerEvents: 'auto',
          top: selectionInfo.bounds.top - 50, left: Math.max(16, selectionInfo.bounds.left + selectionInfo.bounds.width / 2 - 100),
          display: 'flex', alignItems: 'center', gap: 6,
          borderRadius: 12, padding: '8px 14px',
          ...glassStyle,
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {highlightColors.map(color => (
            <button key={color} onClick={() => onAddHighlight(color)}
              style={{
                width: 22, height: 22, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)',
                background: color, cursor: 'pointer', padding: 0,
                transition: 'transform 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            />
          ))}
          <button onClick={onClearSelection}
            style={{
              ...btnStyle, padding: '4px 8px', opacity: 0.6, fontSize: 14,
              borderLeft: '1px solid rgba(255,255,255,0.1)', borderRadius: 0,
            }}
          >✕</button>
        </div>
      )}

      {/* markers panel */}
      {showMarkers && (
        <div onClick={() => setShowMarkers(false)} style={{
          position: 'fixed', inset: 0, zIndex: 9, background: 'transparent',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'absolute', top: 72, right: 16, width: 280, maxHeight: 'calc(100% - 160px)',
            zIndex: 10,
            borderRadius: 14, overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            ...glassStyle,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => setMarkerTab('bookmarks')}
                style={{
                  flex: 1, padding: '10px 0', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: markerTab === 'bookmarks' ? 'rgba(99,102,241,0.2)' : 'transparent',
                  border: 'none', color: fg,
                }}
              >🔖 书签 ({bookmarks.length})</button>
              <button onClick={() => setMarkerTab('highlights')}
                style={{
                  flex: 1, padding: '10px 0', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: markerTab === 'highlights' ? 'rgba(99,102,241,0.2)' : 'transparent',
                  border: 'none', color: fg,
                }}
              >🖍 标注 ({highlights.length})</button>
            </div>
            <div data-scroll="true" style={{ overflowY: 'auto', maxHeight: 320, padding: '8px 0' }}>
              {markerTab === 'bookmarks' && bookmarks.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: fg, opacity: 0.4 }}>暂无书签</div>
              )}
              {markerTab === 'bookmarks' && bookmarks.map(b => (
                <div key={b.id} style={{
                  padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)',
                  display: 'flex', alignItems: 'center', gap: 8, position: 'relative',
                }}
                  onClick={() => onGoToCfi(b.cfi)}
                  onContextMenu={e => { e.preventDefault(); setCtxBmId(b.id!); setCtxPos({ x: e.clientX, y: e.clientY }) }}>
                  <span style={{ fontSize: 12 }}>🔖</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</div>
                    <div style={{ fontSize: 10, color: fg, opacity: 0.35, marginTop: 1 }}>{new Date(b.createdAt).toLocaleString()}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); onRemoveBookmark(b.id!) }}
                    style={{ ...btnStyle, padding: '2px 6px', fontSize: 12, opacity: 0.6, flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                  >✕</button>
                </div>
              ))}
              {markerTab === 'highlights' && highlights.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: fg, opacity: 0.4 }}>暂无标注</div>
              )}
              {markerTab === 'highlights' && highlights.map(h => (
                <div key={h.id} style={{
                  padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                  display: 'flex', alignItems: 'flex-start', gap: 8, position: 'relative',
                }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: h.color, flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: fg, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>"{h.text}"</div>
                    {h.note && <div style={{ fontSize: 10, color: fg, opacity: 0.5, marginTop: 2, fontStyle: 'italic' }}>{h.note}</div>}
                  </div>
                  <button onClick={() => onRemoveHighlight(h.id!, h.cfiRange)}
                    style={{ ...btnStyle, padding: '2px 6px', fontSize: 12, opacity: 0.6, flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {ctxBmId && (
        <div onClick={() => setCtxBmId(null)} style={{
          position: 'fixed', inset: 0, zIndex: 30, background: 'transparent',
        }}>
          <div style={{
            position: 'fixed', top: ctxPos.y, left: ctxPos.x, zIndex: 31,
            borderRadius: 10, overflow: 'hidden',
            background: dark ? 'rgba(20,18,40,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}>
            <button onClick={() => { onRemoveBookmark(ctxBmId); setCtxBmId(null) }}
              style={{
                padding: '8px 20px', cursor: 'pointer', fontSize: 12, color: '#ef4444',
                background: 'none', border: 'none', whiteSpace: 'nowrap', width: '100%', textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >🗑 删除书签</button>
          </div>
        </div>
      )}

      {/* AI button (floating, bottom-right, outside the bottom bar) */}
      {!showAI && (
        <button
          onClick={() => setShowAI(true)}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
          style={{
            position: 'absolute', bottom: 16, right: 16, zIndex: 5,
            border: 'none', borderRadius: 12, padding: '10px 16px',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            opacity: 0.7,
            transition: 'all 0.15s',
            boxShadow: '0 4px 12px rgba(102,126,234,0.4)',
          }}
        >AI</button>
      )}

      {/* AI Panel */}
      <AIPanel
        visible={showAI}
        onClose={() => setShowAI(false)}
        config={aiConfig ?? null}
        theme={theme}
        onGetChapterText={onGetChapterText ?? (async () => '')}
        onGetFullBookText={onGetFullBookText ?? (async () => '')}
      />
    </div>
  )
}
