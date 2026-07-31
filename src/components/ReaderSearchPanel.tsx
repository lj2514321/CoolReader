import React from 'react'
import { X } from 'lucide-react'
import { SearchResult } from '../types'
import '../styles/components/reader.css'

interface ReaderSearchPanelProps {
  visible: boolean
  searchQuery: string
  onSearchQueryChange: (q: string) => void
  searchResults: SearchResult[]
  searching: boolean
  error?: string | null
  inputRef?: React.Ref<HTMLInputElement>
  onNavigateToResult: (result: SearchResult) => void
  onClose: () => void
}

export const ReaderSearchPanel: React.FC<ReaderSearchPanelProps> = ({
  visible,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  searching,
  error,
  inputRef,
  onNavigateToResult,
  onClose,
}) => {
  if (!visible) return null

  return (
    <>
      <div onClick={onClose} className="reader-panel-overlay" />
      <div onClick={e => e.stopPropagation()} className="reader-search-panel reader-glass">
        <div className="reader-search-header">
          <input
            ref={inputRef}
            autoFocus
            value={searchQuery}
            onChange={e => onSearchQueryChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onClose() }}
            placeholder="搜索全书..."
            className="reader-search-input"
            aria-label="搜索全书"
          />
          <button type="button" className="reader-panel-close" onClick={onClose} aria-label="关闭搜索" title="关闭搜索">
            <X size={15} />
          </button>
        </div>
        {searching && <div className="reader-search-status-text">搜索中...</div>}
        {searchResults.length > 0 && (
          <div className="reader-search-status-text">找到 {searchResults.length} 处匹配</div>
        )}
        {searchQuery && searchResults.length === 0 && !searching && (
          <div className="reader-empty-state">{error || '未找到匹配'}</div>
        )}
        <div data-scroll="true" className="reader-search-results">
          {searchResults.map(r => (
            <button type="button" key={`${r.chapterIndex}-${r.matchIndex}`} onClick={() => onNavigateToResult(r)}
              className="reader-search-result-item"
            >
              <span className="reader-meta-text">{r.chapterLabel}</span>
              <span className="reader-search-text">
                {r.contextBefore ? (
                  <span style={{ color: 'var(--reader-panel-muted)' }}>...{r.contextBefore}</span>
                ) : null}
                <span className="reader-search-highlight">{r.matchText}</span>
                {r.contextAfter ? (
                  <span style={{ color: 'var(--reader-panel-muted)' }}>{r.contextAfter}...</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
