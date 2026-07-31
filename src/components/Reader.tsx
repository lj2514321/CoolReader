import { memo, useEffect, useRef, useState } from 'react'
import {
  Sun, Moon, Contrast,
  SlidersHorizontal,
  Trash2,
  Send, X,
  FileText, ScrollText,
} from 'lucide-react'
import { BookMeta, ThemeMode, AIConfig, ReaderLayout, fontFamilies, defaultLayout, Bookmark, Highlight, highlightColors, SearchResult, CustomTheme, defaultCustomTheme, AnimationMode } from '../types'
import { useReaderKeyboard } from '../hooks/useReaderKeyboard'
import { parseRGBA, getCustomThemeBackground, isCustomThemeDark } from '../utils/customTheme'
import { READER_CONTENT_CLICK_EVENT, ReaderContentClickDetail } from '../utils/readerContentEvents'
import { UI_AUTO_HIDE_DELAY, WHEEL_THROTTLE_DELAY, SEARCH_DEBOUNCE_DELAY, CLICK_ZONE_LEFT, CLICK_ZONE_RIGHT, FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_WEIGHT_MIN, FONT_WEIGHT_MAX, FONT_WEIGHT_STEP, LINE_HEIGHT_MIN, LINE_HEIGHT_MAX, LINE_HEIGHT_STEP, MARGIN_MIN, MARGIN_MAX } from '../utils/constants'
import { AIPanel } from './AIPanel'
import { ReaderSearchPanel } from './ReaderSearchPanel'
import { ReaderMarkersPanel } from './ReaderMarkersPanel'
import { ReaderBottomBar, ReaderMoreMenu, ReaderTopBar } from './ReaderChrome'
import '../styles/components/reader.css'

interface ReaderProps {
  filePath: string | null
  meta: BookMeta | null
  theme: ThemeMode
  layout: ReaderLayout
  onLayoutChange: (patch: Partial<ReaderLayout>) => void
  onAnimationModeChange?: (mode: AnimationMode) => void
  onReducedMotionChange?: (reduced: boolean) => void
  progress: number
  onLoad: (path: string) => Promise<void>
  onBack: () => void
  onNext: () => void
  onPrev: () => void
  onToggleSidebar: () => void
  onThemeChange: (t: ThemeMode) => void
  onCustomThemeChange?: (t: CustomTheme) => void
  customTheme?: CustomTheme
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
  onAddHighlight: (color: string, note?: string) => void
  onRemoveHighlight: (id: number, cfiRange: string) => void
  onClearSelection: () => void
  onGoToCfi: (cfi: string) => void
  onSearch: (query: string) => Promise<SearchResult[]>
  onNavigateToSearchResult: (result: SearchResult) => void
}

const themes: { key: ThemeMode; icon: React.ReactNode }[] = [
  { key: 'light', icon: <Sun size={16} /> },
  { key: 'sepia', icon: <Contrast size={16} /> },
  { key: 'dark', icon: <Moon size={16} /> },
]

const themeBg: Record<Exclude<ThemeMode, 'custom'>, string> = {
  light: '#f7f4ed',
  sepia: '#f4ecd8',
  dark: '#1a1a1f',
}

export const Reader = memo(function Reader({
  filePath, meta, theme, layout, onLayoutChange, onAnimationModeChange, onReducedMotionChange, progress, onLoad, onBack, onNext, onPrev, onToggleSidebar, onThemeChange, onCustomThemeChange, customTheme, onSeek, onResize, aiConfig, onGetChapterText, onGetFullBookText, bookmarks, highlights, currentCfi, selectionInfo, onToggleBookmark, onRemoveBookmark, onAddHighlight, onRemoveHighlight, onClearSelection, onGoToCfi, onSearch, onNavigateToSearchResult,
}: ReaderProps) {
  const ct = customTheme ?? defaultCustomTheme
  const customDark = theme === 'custom' && isCustomThemeDark(ct)
  const dark = theme === 'dark' || customDark
  const readerBg = theme === 'custom' ? getCustomThemeBackground(ct) : themeBg[theme]
  const dataTheme = theme === 'custom' ? (customDark ? 'dark' : 'light') : theme

  const nextRef = useRef(onNext)
  const prevRef = useRef(onPrev)
  nextRef.current = onNext
  prevRef.current = onPrev

  const loadedRef = useRef('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!filePath) {
      loadedRef.current = ''
      setLoadError(null)
      return
    }
    const loadKey = `${filePath}:${loadAttempt}`
    if (loadedRef.current === loadKey) return
    loadedRef.current = loadKey
    let cancelled = false
    setLoadError(null)
    void onLoad(filePath).catch(error => {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : String(error))
    })
    return () => { cancelled = true }
  }, [filePath, loadAttempt, onLoad])

  // ResizeObserver — reflow viewer when container resizes (e.g. sidebar toggle)
  useEffect(() => {
    const el = containerRef.current
    if (!el || !onResize) return
    let resizeTimer: ReturnType<typeof setTimeout> | undefined
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => onResize(), 260)
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      clearTimeout(resizeTimer)
    }
  }, [onResize])

  const [showUI, setShowUI] = useState(true)
  const [showLayout, setShowLayout] = useState(false)
  const [showCustomTheme, setShowCustomTheme] = useState(false)
  const [localCustomTheme, setLocalCustomTheme] = useState<CustomTheme>(customTheme ?? defaultCustomTheme)
  const [showAI, setShowAI] = useState(false)
  const [showMarkers, setShowMarkers] = useState(false)
  const [markerTab, setMarkerTab] = useState<'bookmarks' | 'highlights'>('bookmarks')
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [ctxBmId, setCtxBmId] = useState<number | null>(null)
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 })
  const [showSearch, setShowSearch] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showAdvancedLayout, setShowAdvancedLayout] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchRequestRef = useRef(0)
  const [hlNoteColor, setHlNoteColor] = useState<string | null>(null)
  const [hlNoteText, setHlNoteText] = useState('')
  const hlNoteInputRef = useRef<HTMLInputElement>(null)
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
  const showMoreRef = useRef(showMore)
  showMoreRef.current = showMore
  const bookmarkRef = useRef(onToggleBookmark)
  bookmarkRef.current = onToggleBookmark

  useEffect(() => {
    setLocalCustomTheme(customTheme ?? defaultCustomTheme)
  }, [customTheme])

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
    hideTimer.current = setTimeout(() => setShowUI(false), UI_AUTO_HIDE_DELAY)
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
      wheelTimer.current = setTimeout(() => { wheelTimer.current = undefined }, WHEEL_THROTTLE_DELAY)
      if (e.deltaY > 0) nextRef.current()
      else if (e.deltaY < 0) prevRef.current()
    }
    window.addEventListener('wheel', handler, { passive: false })
    return () => {
      window.removeEventListener('wheel', handler)
      clearTimeout(wheelTimer.current)
    }
  }, [])

  const handleViewerPoint = (x: number, w: number) => {
    if (flowRef.current === 'paginated') {
      if (x < w * CLICK_ZONE_LEFT) { prevRef.current(); showControls(); return }
      if (x > w * CLICK_ZONE_RIGHT) { nextRef.current(); showControls(); return }
    }

    const anyPanelOpen = showLayout || showMarkers || showSearch || showAI || showMore
    if (anyPanelOpen) {
      if (showSearch) setShowSearch(false)
      if (showLayout) { setShowLayout(false); setShowCustomTheme(false) }
      if (showMarkers) setShowMarkers(false)
      if (showAI) setShowAI(false)
      if (showMore) setShowMore(false)
      showControls()
    } else {
      setShowUI(v => !v)
      clearTimeout(hideTimer.current)
    }
  }

  const handleViewerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('a, button, input, textarea, select, [contenteditable="true"]')) return
    const selection = window.getSelection()
    if (selection && !selection.isCollapsed) return
    const rect = e.currentTarget.getBoundingClientRect()
    handleViewerPoint(e.clientX - rect.left, rect.width)
  }

  useEffect(() => {
    const handleContentClick = (event: Event) => {
      const { x, width } = (event as CustomEvent<ReaderContentClickDetail>).detail
      handleViewerPoint(x, width)
    }
    window.addEventListener(READER_CONTENT_CLICK_EVENT, handleContentClick)
    return () => window.removeEventListener(READER_CONTENT_CLICK_EVENT, handleContentClick)
  })

  useEffect(() => {
    setIsBookmarked(bookmarks.some(b => b.cfi === currentCfi))
  }, [bookmarks, currentCfi])

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus()
  }, [showSearch])

  useEffect(() => {
    if (hlNoteColor) hlNoteInputRef.current?.focus()
  }, [hlNoteColor])

  const searchTimer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    const requestId = ++searchRequestRef.current
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearchError(null)
      setSearching(false)
      return
    }
    setSearching(true)
    setSearchError(null)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await onSearch(searchQuery)
        if (searchRequestRef.current === requestId) setSearchResults(results)
      } catch (error) {
        if (searchRequestRef.current === requestId) {
          setSearchResults([])
          setSearchError(error instanceof Error ? error.message : '搜索失败')
        }
      } finally {
        if (searchRequestRef.current === requestId) setSearching(false)
      }
    }, SEARCH_DEBOUNCE_DELAY)
    return () => clearTimeout(searchTimer.current)
  }, [searchQuery, onSearch])

  // window-level keyboard — works in both paginated and scroll mode
  useReaderKeyboard(
    nextRef,
    prevRef,
    bookmarkRef,
    showSearchRef,
    showLayoutRef,
    showMarkersRef,
    showAIRef,
    showMoreRef,
    setShowSearch,
    setShowLayout,
    setShowMarkers,
    setShowAI,
    setShowMore,
    showControls,
    layout,
    flowRef,
  )

  const selectionBarWidth = hlNoteColor ? 340 : 180
  const selectionBarLeft = selectionInfo
    ? Math.max(8, Math.min(window.innerWidth - selectionBarWidth - 8, selectionInfo.bounds.left + selectionInfo.bounds.width / 2 - selectionBarWidth / 2))
    : 8
  const selectionBarTop = selectionInfo
    ? Math.max(8, Math.min(window.innerHeight - (hlNoteColor ? 104 : 52), selectionInfo.bounds.top - (hlNoteColor ? 90 : 50)))
    : 8

  return (
    <div ref={containerRef} className="reader-root" data-theme={dataTheme} style={{ height: '100%', background: readerBg, overflow: 'hidden', position: 'relative' }}>
      <div
        id="viewer"
        className="reader-viewer"
        data-flow={layout.flow}
        onClick={handleViewerClick}
        style={{ position: 'absolute', inset: 0 }}
      />

      {loadError && (
        <div className="reader-load-error" role="alert">
          <div>无法打开此书</div>
          <div className="reader-load-error-detail">{loadError}</div>
          <button className="reader-btn" onClick={() => setLoadAttempt(value => value + 1)}>重试</button>
        </div>
      )}

      <ReaderTopBar
        meta={meta}
        showUI={showUI}
        showLayout={showLayout}
        showMarkers={showMarkers}
        showMore={showMore}
        isBookmarked={isBookmarked}
        onBack={onBack}
        onToggleBookmark={onToggleBookmark}
        onToggleMarkers={() => {
          setShowMarkers(v => !v)
          setShowLayout(false)
          setShowSearch(false)
          setShowAI(false)
          setShowMore(false)
        }}
        onToggleLayout={() => {
          setShowLayout(v => !v)
          setShowMarkers(false)
          setShowAI(false)
          setShowMore(false)
        }}
        onToggleMore={() => {
          setShowMore(v => !v)
          setShowLayout(false)
          setShowMarkers(false)
          setShowAI(false)
        }}
      />

      <ReaderMoreMenu
        visible={showMore}
        onToggleFullscreen={() => { window.electronAPI?.toggleFullscreen(); setShowMore(false) }}
      />

      {showLayout && (
        <>
          <div onClick={() => { setShowLayout(false); setShowCustomTheme(false); setShowAdvancedLayout(false) }} className="reader-panel-overlay" />
          <div onClick={e => e.stopPropagation()} className="reader-layout-panel reader-glass">
            <div className="reader-panel-tabs" role="tablist" aria-label="阅读设置分类">
              <button
                type="button"
                role="tab"
                aria-selected={!showAdvancedLayout}
                className={`reader-panel-tab${!showAdvancedLayout ? ' reader-panel-tab-active' : ''}`}
                onClick={() => setShowAdvancedLayout(false)}
              >基础</button>
              <button
                type="button"
                role="tab"
                aria-selected={showAdvancedLayout}
                className={`reader-panel-tab${showAdvancedLayout ? ' reader-panel-tab-active' : ''}`}
                onClick={() => { setShowAdvancedLayout(true); setShowCustomTheme(false) }}
              >高级</button>
            </div>

            {!showAdvancedLayout && (
              <>
                <div className="reader-section-label">主题</div>
                <div className="reader-layout-row reader-theme-options">
                  {themes.filter(t => t.key !== 'custom').map(t => (
                    <button key={t.key} onClick={() => { onThemeChange(t.key); setShowCustomTheme(false) }}
                      className={theme === t.key ? 'reader-btn-active' : 'reader-btn'}
                      aria-label={t.key === 'light' ? '浅色主题' : t.key === 'sepia' ? '纸张主题' : '深色主题'}
                      title={t.key === 'light' ? '浅色主题' : t.key === 'sepia' ? '纸张主题' : '深色主题'}
                    >{t.icon}</button>
                  ))}
                  <button onClick={() => { onThemeChange('custom'); setShowCustomTheme(v => !v) }}
                    className={theme === 'custom' ? 'reader-btn-active' : 'reader-btn'}
                    aria-label="自定义主题"
                    title="自定义主题"
                  ><SlidersHorizontal size={16} /></button>
                </div>

                <div className="reader-section-label">字号</div>
                <div className="reader-layout-row">
                  <button onClick={() => onLayoutChange({ fontSize: Math.max(FONT_SIZE_MIN, layout.fontSize - 10) })}
                    className="reader-btn">A-</button>
                  <input type="range" min={FONT_SIZE_MIN} max={FONT_SIZE_MAX} value={layout.fontSize}
                    onChange={e => onLayoutChange({ fontSize: Number(e.target.value) })}
                    aria-label="字号"
                    aria-valuetext={`${layout.fontSize}%`}
                    className="reader-range-input" />
                  <button onClick={() => onLayoutChange({ fontSize: Math.min(FONT_SIZE_MAX, layout.fontSize + 10) })}
                    className="reader-btn">A+</button>
                </div>
                <div className="reader-readout">{layout.fontSize}%</div>

                <div className="reader-section-label">行距</div>
                <div className="reader-layout-row">
                  <button onClick={() => onLayoutChange({ lineHeight: Math.max(1, +(layout.lineHeight - LINE_HEIGHT_STEP).toFixed(1)) })}
                    className="reader-btn">-</button>
                  <input type="range" min={LINE_HEIGHT_MIN} max={LINE_HEIGHT_MAX} value={Math.round(layout.lineHeight * 10)}
                    onChange={e => onLayoutChange({ lineHeight: Number(e.target.value) / 10 })}
                    aria-label="行距"
                    aria-valuetext={layout.lineHeight.toFixed(1)}
                    className="reader-range-input" />
                  <button onClick={() => onLayoutChange({ lineHeight: Math.min(2.5, +(layout.lineHeight + LINE_HEIGHT_STEP).toFixed(1)) })}
                    className="reader-btn">+</button>
                </div>
                <div className="reader-readout">{layout.lineHeight.toFixed(1)}</div>
              </>
            )}

            {showAdvancedLayout && (
              <>
                <div className="reader-section-label">字体</div>
                <select value={layout.fontFamily}
                  onChange={e => onLayoutChange({ fontFamily: e.target.value })}
                  className="reader-select-input"
                  aria-label="字体"
                >
                  {fontFamilies.map(f => (
                    <option key={f.value} value={f.value} style={{ color: '#000' }}>{f.label}</option>
                  ))}
                </select>

                <div className="reader-section-label">字重</div>
                <div className="reader-layout-row">
                  <button onClick={() => onLayoutChange({ fontWeight: Math.max(FONT_WEIGHT_MIN, (layout.fontWeight || 400) - FONT_WEIGHT_STEP) })}
                    className="reader-btn">-</button>
                  <input type="range" min={FONT_WEIGHT_MIN} max={FONT_WEIGHT_MAX} step={FONT_WEIGHT_STEP} value={layout.fontWeight || 400}
                    onChange={e => onLayoutChange({ fontWeight: Number(e.target.value) })}
                    aria-label="字重"
                    aria-valuetext={`${layout.fontWeight || 400}`}
                    className="reader-range-input" />
                  <button onClick={() => onLayoutChange({ fontWeight: Math.min(FONT_WEIGHT_MAX, (layout.fontWeight || 400) + FONT_WEIGHT_STEP) })}
                    className="reader-btn">+</button>
                </div>
                <div className="reader-readout">
                  {(layout.fontWeight || 400) === 300 ? '细体' : (layout.fontWeight || 400) === 400 ? '常规' : (layout.fontWeight || 400) === 500 ? '中等' : (layout.fontWeight || 400) === 600 ? '粗体' : (layout.fontWeight || 400) === 700 ? '特粗' : `${layout.fontWeight || 400}`}
                </div>

                <div className="reader-section-label">边距</div>
                <div className="reader-layout-row">
                  <button onClick={() => onLayoutChange({ margin: Math.max(MARGIN_MIN, layout.margin - 5) })}
                    className="reader-btn">-</button>
                  <input type="range" min={MARGIN_MIN} max={MARGIN_MAX} value={layout.margin}
                    onChange={e => onLayoutChange({ margin: Number(e.target.value) })}
                    aria-label="页面边距"
                    aria-valuetext={`${layout.margin}px`}
                    className="reader-range-input" />
                  <button onClick={() => onLayoutChange({ margin: Math.min(MARGIN_MAX, layout.margin + 5) })}
                    className="reader-btn">+</button>
                </div>
                <div className="reader-readout">{layout.margin}px</div>

                <div className="reader-section-label">翻页模式</div>
                <div className="reader-layout-row">
                  <button onClick={() => onLayoutChange({ flow: 'paginated' })}
                    className={layout.flow === 'paginated' ? 'reader-btn-active' : 'reader-btn'}
                  ><FileText size={14} />分页</button>
                  <button onClick={() => onLayoutChange({ flow: 'scrolled-doc' })}
                    className={layout.flow === 'scrolled-doc' ? 'reader-btn-active' : 'reader-btn'}
                  ><ScrollText size={14} />滚动</button>
                </div>

                <div className="reader-section-label">翻页动画</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  {[
                    { key: 'fade', label: '淡入淡出' },
                    { key: 'slide', label: '左右滑动' },
                    { key: 'blur-focus', label: '闪烁聚焦' },
                    { key: 'slide-fade', label: '滑动+淡出' },
                  ].map(opt => (
                    <button key={opt.key}
                      onClick={() => onAnimationModeChange?.(opt.key as AnimationMode)}
                      className={(layout.animationMode || 'slide') === opt.key ? 'reader-btn-active' : 'reader-btn'}
                    >{opt.label}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <label style={{ fontSize: 12, color: 'var(--reader-panel-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox"
                      checked={layout.reducedMotion ?? false}
                      onChange={e => onReducedMotionChange?.(e.target.checked)}
                      style={{ accentColor: 'var(--reader-fg)' }}
                    />
                    减少动画
                  </label>
                </div>
              </>
            )}

            {/* Custom theme editor (inside layout panel, behind SlidersHorizontal button) */}
            {!showAdvancedLayout && showCustomTheme && (
              <div className="reader-custom-theme-editor">
                <div className="reader-layout-row">
                  <button onClick={() => setLocalCustomTheme(t => ({ ...t, type: 'solid' }))}
                    className={localCustomTheme.type === 'solid' ? 'reader-btn-active' : 'reader-btn'}
                  >纯色</button>
                  <button onClick={() => setLocalCustomTheme(t => ({ ...t, type: 'gradient' }))}
                    className={localCustomTheme.type === 'gradient' ? 'reader-btn-active' : 'reader-btn'}
                  >渐变</button>
                </div>
                {localCustomTheme.type === 'solid' && (
                  <div className="reader-layout-row">
                    <input
                      type="color"
                      value={'#' + parseRGBA(localCustomTheme.color || 'rgba(255,255,255,1)').slice(0, 3).map(c => c.toString(16).padStart(2, '0')).join('')}
                      onChange={e => { const [r,g,b] = parseRGBA(e.target.value); setLocalCustomTheme(t => ({ ...t, color: `rgba(${r},${g},${b},1)` })) }}
                      className="reader-color-input-sm"
                      aria-label="主题颜色"
                    />
                    <span className="reader-panel-text">透明度</span>
                    <input
                      type="range" min={70} max={100} value={Math.round((parseRGBA(localCustomTheme.color || 'rgba(255,255,255,1)')[3]) * 100)}
                      onChange={e => {
                        const a = Number(e.target.value) / 100
                        const [r,g,b] = parseRGBA(localCustomTheme.color || 'rgba(255,255,255,1)')
                        setLocalCustomTheme(t => ({ ...t, color: `rgba(${r},${g},${b},${a})` }))
                        onCustomThemeChange?.({ ...localCustomTheme, color: `rgba(${r},${g},${b},${a})` })
                      }}
                      aria-label="主题透明度"
                      className="reader-range-input"
                    />
                    <span className="reader-panel-text-sm">
                      {Math.round(parseRGBA(localCustomTheme.color || 'rgba(255,255,255,1)')[3] * 100)}%
                    </span>
                  </div>
                )}
                {localCustomTheme.type === 'gradient' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="reader-layout-row">
                      <button onClick={() => setLocalCustomTheme(t => ({ ...t, gradientType: 'linear' }))}
                        className={localCustomTheme.gradientType === 'linear' ? 'reader-btn-active' : 'reader-btn'}
                      >线性</button>
                      <button onClick={() => setLocalCustomTheme(t => ({ ...t, gradientType: 'radial' }))}
                        className={localCustomTheme.gradientType === 'radial' ? 'reader-btn-active' : 'reader-btn'}
                      >径向</button>
                      {localCustomTheme.gradientType === 'linear' && (
                        <>
                          <span className="reader-panel-text">角度</span>
                          <input type="range" min={0} max={360} step={15} value={localCustomTheme.gradientAngle ?? 135}
                            onChange={e => setLocalCustomTheme(t => ({ ...t, gradientAngle: Number(e.target.value) }))}
                            aria-label="渐变角度"
                            className="reader-range-input" />
                          <span className="reader-panel-text-sm">{localCustomTheme.gradientAngle ?? 135}°</span>
                        </>
                      )}
                    </div>
                    <div className="reader-layout-row">
                      <button onClick={() => setLocalCustomTheme(t => ({ ...t, gradientStops: [...(t.gradientStops || []), { color: 'rgba(128,128,128,0.8)', position: 50 }] }))}
                        className="reader-btn">+色标</button>
                      {(localCustomTheme.gradientStops || []).length > 0 && (
                        <button onClick={() => setLocalCustomTheme(t => ({ ...t, gradientStops: t.gradientStops?.slice(0, -1) }))}
                          className="reader-btn">-色标</button>
                      )}
                    </div>
                    {(localCustomTheme.gradientStops || []).map((stop, idx) => (
                      <div key={idx} className="reader-layout-row">
                        <input type="color" value={'#' + parseRGBA(stop.color).slice(0, 3).map(c => c.toString(16).padStart(2, '0')).join('')} onChange={e => { const [r,g,b] = parseRGBA(e.target.value); const s = [...(localCustomTheme.gradientStops || [])]; s[idx] = { ...s[idx], color: `rgba(${r},${g},${b},1)` }; setLocalCustomTheme(t => ({ ...t, gradientStops: s })) }} className="reader-color-input" aria-label={`色标 ${idx + 1} 颜色`} />
                        <input type="range" min={0} max={100} value={stop.position} onChange={e => { const s = [...(localCustomTheme.gradientStops || [])]; s[idx] = { ...s[idx], position: Number(e.target.value) }; setLocalCustomTheme(t => ({ ...t, gradientStops: s })) }} className="reader-range-input" aria-label={`色标 ${idx + 1} 位置`} />
                        <span className="reader-panel-text-sm">{stop.position}%</span>
                        <button onClick={() => { const s = (localCustomTheme.gradientStops || []).filter((_, i) => i !== idx); setLocalCustomTheme(t => ({ ...t, gradientStops: s })) }}
                          aria-label={`删除色标 ${idx + 1}`}
                          title="删除色标"
                          className="reader-btn" style={{ color: 'rgba(255,100,100,0.8)' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => { onCustomThemeChange?.(localCustomTheme); onThemeChange('custom') }}
                  className="reader-btn reader-apply-theme-btn">应用自定义</button>
              </div>
            )}
          </div>
        </>
      )}

      <ReaderSearchPanel
        visible={showSearch}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchResults={searchResults}
        searching={searching}
        error={searchError}
        inputRef={searchInputRef}
        onNavigateToResult={onNavigateToSearchResult}
        onClose={() => setShowSearch(false)}
      />

      {/* bottom bar */}
      <ReaderBottomBar
        showUI={showUI}
        progress={progress}
        onPrev={onPrev}
        onNext={onNext}
        onSeek={onSeek}
        onToggleSidebar={onToggleSidebar}
        onOpenSearch={() => {
          setShowSearch(v => !v)
          setShowLayout(false)
          setShowMarkers(false)
          setShowAI(false)
          setShowMore(false)
        }}
        onOpenAI={() => {
          setShowAI(v => !v)
          setShowLayout(false)
          setShowMarkers(false)
          setShowSearch(false)
          setShowMore(false)
        }}
        showSearch={showSearch}
        showAI={showAI}
      />

      {/* selection toolbar */}
      {selectionInfo && (
        <div className="reader-selection-bar"
          style={{
            top: selectionBarTop,
            left: selectionBarLeft,
            maxWidth: 'calc(100vw - 16px)',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {highlightColors.map((color, index) => (
              <button key={color} onClick={() => {
                setHlNoteColor(color)
                setHlNoteText('')
              }}
                aria-label={`标注颜色 ${index + 1}`}
                title={`标注颜色 ${index + 1}`}
                className="reader-selection-color-btn"
                style={{ background: color, outline: hlNoteColor === color ? '2px solid var(--reader-fg)' : 'none' }}
              />
            ))}
            <button onClick={() => { onClearSelection(); setHlNoteColor(null) }}
              aria-label="清除选择"
              title="清除选择"
              className="reader-btn reader-selection-clear-btn"
            ><X size={16} /></button>
          </div>
          {hlNoteColor && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <input
                ref={hlNoteInputRef}
                value={hlNoteText}
                onChange={e => setHlNoteText(e.target.value)}
                placeholder="添加笔记（可选）..."
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    onAddHighlight(hlNoteColor, hlNoteText.trim() || undefined)
                    setHlNoteColor(null)
                    setHlNoteText('')
                  }
                  if (e.key === 'Escape') { setHlNoteColor(null); setHlNoteText('') }
                }}
                className="reader-hl-note-input"
              />
              <button onClick={() => {
                onAddHighlight(hlNoteColor, hlNoteText.trim() || undefined)
                setHlNoteColor(null)
                setHlNoteText('')
              }}
                aria-label="保存标注"
                title="保存标注"
                className="reader-btn"
                style={{ padding: '4px 8px', color: 'var(--reader-fg)' }}
              ><Send size={14} /></button>
            </div>
          )}
        </div>
      )}

      <ReaderMarkersPanel
        visible={showMarkers}
        markerTab={markerTab}
        onMarkerTabChange={setMarkerTab}
        bookmarks={bookmarks}
        highlights={highlights}
        onGoToCfi={onGoToCfi}
        onRemoveBookmark={onRemoveBookmark}
        onRemoveHighlight={onRemoveHighlight}
        onCtxMenu={(id, e) => { setCtxBmId(Number(id)); setCtxPos({ x: e.clientX, y: e.clientY }) }}
        onClose={() => setShowMarkers(false)}
      />

      {ctxBmId !== null && (
        <div onClick={() => setCtxBmId(null)} className="reader-panel-overlay" style={{ zIndex: 70 }}>
          <div className="reader-context-menu" style={{
            left: Math.max(8, Math.min(ctxPos.x, window.innerWidth - 176)),
            top: Math.max(8, Math.min(ctxPos.y, window.innerHeight - 56)),
          }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { onRemoveBookmark(ctxBmId); setCtxBmId(null) }}
              className="reader-context-btn reader-context-delete-btn"
            ><Trash2 size={14} /> 删除书签</button>
          </div>
        </div>
      )}

      {/* AI Panel */}
      <AIPanel
        key={filePath ?? 'no-book'}
        visible={showAI}
        onClose={() => setShowAI(false)}
        config={aiConfig ?? null}
        theme={dataTheme}
        onGetChapterText={onGetChapterText ?? (async () => '')}
        onGetFullBookText={onGetFullBookText ?? (async () => '')}
      />
    </div>
  )
}
)
