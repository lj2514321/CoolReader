import React from 'react'
import type { Bookmark, Highlight } from '../types'
import { Bookmark as BookmarkIcon, Highlighter, X } from 'lucide-react'
import '../styles/components/reader.css'

interface ReaderMarkersPanelProps {
  visible: boolean
  markerTab: 'bookmarks' | 'highlights'
  onMarkerTabChange: (tab: 'bookmarks' | 'highlights') => void
  bookmarks: Bookmark[]
  highlights: Highlight[]
  onGoToCfi: (cfi: string) => void
  onRemoveBookmark: (id: number) => void
  onRemoveHighlight: (id: number, cfiRange: string) => void
  onCtxMenu: (id: string, e: React.MouseEvent) => void
  onClose: () => void
}

export const ReaderMarkersPanel: React.FC<ReaderMarkersPanelProps> = ({
  visible,
  markerTab,
  onMarkerTabChange,
  bookmarks,
  highlights,
  onGoToCfi,
  onRemoveBookmark,
  onRemoveHighlight,
  onCtxMenu,
  onClose,
}) => {
  if (!visible) return null

  return (
    <>
      <div onClick={onClose} className="reader-panel-overlay">
        <div onClick={e => e.stopPropagation()} className="reader-markers-panel reader-glass">
          <div className="reader-marker-tabs" role="tablist" aria-label="书签与标注">
            <button type="button" role="tab" aria-selected={markerTab === 'bookmarks'}
              onClick={() => onMarkerTabChange('bookmarks')}
              className={`reader-marker-tab${markerTab === 'bookmarks' ? ' reader-marker-tab-active' : ''}`}
            ><BookmarkIcon size={14} /> 书签 ({bookmarks.length})</button>
            <button type="button" role="tab" aria-selected={markerTab === 'highlights'}
              onClick={() => onMarkerTabChange('highlights')}
              className={`reader-marker-tab${markerTab === 'highlights' ? ' reader-marker-tab-active' : ''}`}
            ><Highlighter size={14} /> 标注 ({highlights.length})</button>
          </div>
          <div data-scroll="true" className="reader-marker-list">
            {markerTab === 'bookmarks' && bookmarks.length === 0 && (
              <div className="reader-empty-state">暂无书签</div>
            )}
            {markerTab === 'bookmarks' && bookmarks.map(b => (
              <div key={b.id} className="reader-marker-item">
                <button type="button" className="reader-marker-main"
                  onClick={() => onGoToCfi(b.location || b.cfi)}
                  onContextMenu={e => { e.preventDefault(); onCtxMenu(String(b.id), e) }}>
                  <BookmarkIcon size={12} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="reader-text-ellipsis" style={{ display: 'block', fontSize: 12, color: 'var(--reader-fg)' }}>{b.label}</span>
                    <span className="reader-meta-text" style={{ display: 'block', marginTop: 1 }}>{new Date(b.createdAt).toLocaleString()}</span>
                  </span>
                </button>
                <button type="button" aria-label="删除书签" title="删除书签"
                  onClick={e => { e.stopPropagation(); onRemoveBookmark(b.id!) }}
                  className="reader-btn reader-marker-delete-btn"
                  style={{ padding: '2px 6px', fontSize: 12, flexShrink: 0 }}
                ><X size={12} /></button>
              </div>
            ))}
            {markerTab === 'highlights' && highlights.length === 0 && (
              <div className="reader-empty-state">暂无标注</div>
            )}
            {markerTab === 'highlights' && highlights.map(h => (
              <div key={h.id} className="reader-marker-item">
                <button type="button" className="reader-marker-main" onClick={() => onGoToCfi(h.location || h.cfiRange)}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: h.color, flexShrink: 0, marginTop: 2 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12, color: 'var(--reader-fg)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>"{h.text}"</span>
                    {h.note && <span style={{ display: 'block', fontSize: 11, color: 'var(--reader-panel-muted)', marginTop: 2, fontStyle: 'italic' }}>{h.note}</span>}
                  </span>
                </button>
                <button type="button" aria-label="删除标注" title="删除标注"
                  onClick={e => { e.stopPropagation(); onRemoveHighlight(h.id!, h.location || h.cfiRange) }}
                  className="reader-btn reader-marker-delete-btn"
                  style={{ padding: '2px 6px', fontSize: 12, flexShrink: 0 }}
                ><X size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
