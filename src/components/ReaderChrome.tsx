import {
  ArrowLeft,
  Bookmark as BookmarkIcon,
  ChevronLeft,
  ChevronRight,
  List,
  Maximize2,
  MoreVertical,
  Search,
  Sparkles,
} from 'lucide-react'
import type { BookMeta } from '../types'

interface ReaderTopBarProps {
  meta: BookMeta | null
  showUI: boolean
  showLayout: boolean
  showMarkers: boolean
  showMore: boolean
  isBookmarked: boolean
  onBack: () => void
  onToggleBookmark: () => void
  onToggleLayout: () => void
  onToggleMore: () => void
}

export function ReaderTopBar({
  meta,
  showUI,
  showLayout,
  showMarkers,
  showMore,
  isBookmarked,
  onBack,
  onToggleBookmark,
  onToggleLayout,
  onToggleMore,
}: ReaderTopBarProps) {
  const visible = showUI || showLayout || showMarkers || showMore

  return (
    <div
      className="reader-top-bar"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.24s ease, transform 0.24s ease',
        zIndex: showLayout ? 60 : 2,
      }}
    >
      <div className="reader-top-bar-inner">
        <button onClick={onBack} className="reader-btn"><ArrowLeft size={16} />&ensp;返回</button>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: 'var(--reader-fg)' }} className="reader-text-ellipsis">
          {meta?.title || ''}
        </span>
        <button onClick={(e) => { e.stopPropagation(); onToggleLayout() }}
          className={`reader-btn${showLayout ? ' reader-btn-active' : ''}`}
          style={{ padding: '7px 12px', opacity: 1 }}
        >Aa</button>
        <button onClick={(e) => { e.stopPropagation(); onToggleBookmark() }}
          className={`reader-btn${isBookmarked ? ' reader-btn-active' : ''}`}
          style={{ padding: '7px 12px', opacity: 1 }}
        ><BookmarkIcon size={15} /></button>
        <button onClick={(e) => { e.stopPropagation(); onToggleMore() }}
          className={`reader-btn${showMore ? ' reader-btn-active' : ''}`}
          style={{ padding: '7px 12px', opacity: 1 }}
        ><MoreVertical size={15} /></button>
      </div>
    </div>
  )
}

interface ReaderMoreMenuProps {
  visible: boolean
  onToggleFullscreen: () => void
}

export function ReaderMoreMenu({
  visible,
  onToggleFullscreen,
}: ReaderMoreMenuProps) {
  if (!visible) return null

  return (
    <div className="reader-more-menu reader-glass" onClick={e => e.stopPropagation()}>
      <button onClick={onToggleFullscreen} className="reader-more-item"><Maximize2 size={14} />&ensp;全屏</button>
    </div>
  )
}

interface ReaderBottomBarProps {
  showUI: boolean
  progress: number
  onPrev: () => void
  onNext: () => void
  onSeek: (pct: number) => void
  onToggleSidebar: () => void
  onOpenSearch: () => void
  onOpenAI: () => void
  showSearch: boolean
  showAI: boolean
}

export function ReaderBottomBar({
  showUI,
  progress,
  onPrev,
  onNext,
  onSeek,
  onToggleSidebar,
  onOpenSearch,
  onOpenAI,
  showSearch,
  showAI,
}: ReaderBottomBarProps) {
  return (
    <div
      className="reader-bottom-bar"
      style={{
        opacity: showUI ? 1 : 0,
        transform: showUI ? 'translateY(0)' : 'translateY(100%)',
        pointerEvents: showUI ? 'auto' : 'none',
        transition: 'opacity 0.24s ease, transform 0.24s ease',
        zIndex: 2,
      }}
    >
      <div className="reader-bottom-bar-inner reader-glass">
        <button onClick={onToggleSidebar} className="reader-btn"><List size={16} />&ensp;目录</button>
        <button onClick={onOpenSearch} className={`reader-btn${showSearch ? ' reader-btn-active' : ''}`}><Search size={16} />&ensp;搜索</button>
        <button onClick={onOpenAI} className={`reader-btn${showAI ? ' reader-btn-active' : ''}`}><Sparkles size={16} />&ensp;AI</button>
        <div className="reader-bottom-divider" />
        <button onClick={onPrev} className="reader-btn"><ChevronLeft size={16} />&ensp;上一页</button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            onClick={e => {
              const r = e.currentTarget.getBoundingClientRect()
              onSeek(Math.round(((e.clientX - r.left) / r.width) * 100))
            }}
            className="reader-progress-track"
          >
            <div
              className="reader-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--reader-fg)', opacity: 0.5, minWidth: 32, textAlign: 'right' }}>{progress}%</span>
        </div>

        <button onClick={onNext} className="reader-btn">下一页&ensp;<ChevronRight size={16} /></button>
      </div>
    </div>
  )
}
