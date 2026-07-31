import {
  ArrowLeft,
  Bookmark as BookmarkIcon,
  ChevronLeft,
  ChevronRight,
  List,
  Highlighter,
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
  onToggleMarkers: () => void
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
  onToggleMarkers,
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
      }}
    >
      <div className="reader-top-bar-inner">
        <button onClick={onBack} className="reader-btn reader-back-btn" aria-label="返回书架" title="返回书架">
          <ArrowLeft size={16} /><span className="reader-button-label">返回</span>
        </button>
        <span className="reader-title reader-text-ellipsis">
          {meta?.title || ''}
        </span>
        <div className="reader-top-actions">
          <button onClick={(e) => { e.stopPropagation(); onToggleLayout() }}
            className={`reader-btn reader-icon-btn${showLayout ? ' reader-btn-active' : ''}`}
            aria-label="阅读设置"
            title="阅读设置"
          >Aa</button>
          <button onClick={(e) => { e.stopPropagation(); onToggleBookmark() }}
            className={`reader-btn reader-icon-btn${isBookmarked ? ' reader-btn-active' : ''}`}
            aria-label={isBookmarked ? '移除书签' : '添加书签'}
            title={isBookmarked ? '移除书签' : '添加书签'}
          ><BookmarkIcon size={15} /></button>
          <button onClick={(e) => { e.stopPropagation(); onToggleMarkers() }}
            className={`reader-btn reader-icon-btn${showMarkers ? ' reader-btn-active' : ''}`}
            aria-label="书签与标注"
            title="书签与标注"
          ><Highlighter size={15} /></button>
          <button onClick={(e) => { e.stopPropagation(); onToggleMore() }}
            className={`reader-btn reader-icon-btn${showMore ? ' reader-btn-active' : ''}`}
            aria-label="更多操作"
            title="更多操作"
          ><MoreVertical size={15} /></button>
        </div>
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
      <button onClick={onToggleFullscreen} className="reader-more-item"><Maximize2 size={14} /><span>全屏</span></button>
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
      }}
    >
      <div className="reader-bottom-bar-inner reader-glass">
        <div className="reader-bottom-tools">
          <button onClick={onToggleSidebar} className="reader-btn" aria-label="目录" title="目录"><List size={16} /><span className="reader-button-label">目录</span></button>
          <button onClick={onOpenSearch} className={`reader-btn${showSearch ? ' reader-btn-active' : ''}`} aria-label="搜索全书" title="搜索全书"><Search size={16} /><span className="reader-button-label">搜索</span></button>
          <button onClick={onOpenAI} className={`reader-btn${showAI ? ' reader-btn-active' : ''}`} aria-label="AI 助手" title="AI 助手"><Sparkles size={16} /><span className="reader-button-label">AI</span></button>
        </div>
        <div className="reader-bottom-divider" />
        <div className="reader-bottom-navigation">
          <button onClick={onPrev} className="reader-btn" aria-label="上一页" title="上一页"><ChevronLeft size={16} /><span className="reader-button-label">上一页</span></button>

          <div className="reader-progress-group">
          <div
            onClick={e => {
              const r = e.currentTarget.getBoundingClientRect()
              onSeek(Math.round(((e.clientX - r.left) / r.width) * 100))
            }}
            onKeyDown={e => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onSeek(Math.max(0, progress - 2)) }
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onSeek(Math.min(100, progress + 2)) }
              if (e.key === 'Home') { e.preventDefault(); onSeek(0) }
              if (e.key === 'End') { e.preventDefault(); onSeek(100) }
            }}
            role="slider"
            tabIndex={0}
            aria-label="阅读进度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="reader-progress-track"
          >
            <div
              className="reader-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
            <span className="reader-progress-value">{progress}%</span>
          </div>

          <button onClick={onNext} className="reader-btn" aria-label="下一页" title="下一页"><span className="reader-button-label">下一页</span><ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
  )
}
