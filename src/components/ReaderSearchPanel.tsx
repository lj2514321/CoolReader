import React from 'react'
import { SearchResult } from '../types'
import '../styles/components/reader.css'

interface ReaderSearchPanelProps {
  visible: boolean
  searchQuery: string
  onSearchQueryChange: (q: string) => void
  searchResults: SearchResult[]
  searching: boolean
  onNavigateToResult: (result: SearchResult) => void
  onClose: () => void
}

export const ReaderSearchPanel: React.FC<ReaderSearchPanelProps> = ({
  visible,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  searching,
  onNavigateToResult,
  onClose,
}) => {
  if (!visible) return null

  return (
    <>
      <div onClick={onClose} className="reader-panel-overlay" />
      <div onClick={e => e.stopPropagation()} className="reader-search-panel reader-glass">
        <div className="reader-layout-row">
          <input
            value={searchQuery}
            onChange={e => onSearchQueryChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onClose() }}
            placeholder="搜索全书..."
            className="reader-search-input"
          />
          {searching && <span style={{ fontSize: 12, color: 'var(--reader-panel-text)', alignSelf: 'center' }}>搜索中...</span>}
        </div>
        {searchResults.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--reader-panel-text)', padding: '0 4px' }}>找到 {searchResults.length} 处匹配</div>
        )}
        {searchQuery && searchResults.length === 0 && !searching && (
          <div className="reader-empty-state">未找到匹配</div>
        )}
        <div data-scroll="true" style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {searchResults.map((r, idx) => (
            <div key={`${r.chapterIndex}-${r.matchIndex}`} onClick={() => onNavigateToResult(r)}
              className="reader-search-result-item"
            >
              <span className="reader-meta-text">{r.chapterLabel}</span>
              <div className="reader-search-text">
                {r.contextBefore ? (
                  <span style={{ color: 'var(--reader-panel-muted)' }}>...{r.contextBefore}</span>
                ) : null}
                <span className="reader-search-highlight">{r.matchText}</span>
                {r.contextAfter ? (
                  <span style={{ color: 'var(--reader-panel-muted)' }}>{r.contextAfter}...</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}