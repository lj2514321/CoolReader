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
  ctxBmId: number | null
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
  ctxBmId,
  onCtxMenu,
  onClose,
}) => {
  if (!visible) return null

  return (
    <>
      <div onClick={onClose} className="reader-panel-overlay">
        <div onClick={e => e.stopPropagation()} className="reader-markers-panel reader-glass">
          <div className="reader-marker-tab">
            <button onClick={() => onMarkerTabChange('bookmarks')}
              className={markerTab === 'bookmarks' ? 'reader-marker-tab reader-marker-tab-active' : 'reader-marker-tab'}
            ><BookmarkIcon size={14} /> 书签 ({bookmarks.length})</button>
            <button onClick={() => onMarkerTabChange('highlights')}
              className={markerTab === 'highlights' ? 'reader-marker-tab reader-marker-tab-active' : 'reader-marker-tab'}
            ><Highlighter size={14} /> 标注 ({highlights.length})</button>
          </div>
          <div data-scroll="true" style={{ overflowY: 'auto', maxHeight: 320, padding: '8px 0' }}>
            {markerTab === 'bookmarks' && bookmarks.length === 0 && (
              <div className="reader-empty-state">暂无书签</div>
            )}
            {markerTab === 'bookmarks' && bookmarks.map(b => (
              <div key={b.id} className="reader-marker-item"
                onClick={() => onGoToCfi(b.cfi)}
                onContextMenu={e => { e.preventDefault(); onCtxMenu(String(b.id), e) }}>
                <BookmarkIcon size={12} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="reader-text-ellipsis" style={{ fontSize: 12, color: 'var(--reader-fg)' }}>{b.label}</div>
                  <div className="reader-meta-text" style={{ marginTop: 1 }}>{new Date(b.createdAt).toLocaleString()}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); onRemoveBookmark(b.id!) }}
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
                <div style={{ width: 12, height: 12, borderRadius: 3, background: h.color, flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--reader-fg)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>"{h.text}"</div>
                  {h.note && <div style={{ fontSize: 10, color: 'var(--reader-panel-muted)', marginTop: 2, fontStyle: 'italic' }}>{h.note}</div>}
                </div>
                <button onClick={() => onRemoveHighlight(h.id!, h.cfiRange)}
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