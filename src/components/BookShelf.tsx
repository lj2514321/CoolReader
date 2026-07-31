import { useState, useMemo, memo, useEffect, useRef } from 'react'
import { BookEntry } from '../types'
import { loadSetting } from '../utils/db'
import { BookOpen, ChevronLeft, ChevronRight, Timer, Library, MoreVertical, Trash2, Target } from 'lucide-react'
import { useBookCover } from '../hooks/useBookCover'
import { colors } from '../utils/styles'
import '../styles/components/bookshelf.css'

type SortBy = 'recent' | 'title' | 'author'

const sortOptions: { key: SortBy; label: string }[] = [
  { key: 'recent', label: '最近阅读' },
  { key: 'title', label: '书名' },
  { key: 'author', label: '作者' },
]

function formatRelativeTime(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  const weeks = Math.floor(days / 7)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  if (hours < 24) {
    const d = new Date(ts)
    return `今天 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }
  const yesterday = new Date(now - 86400000)
  if (
    new Date(ts).getDate() === yesterday.getDate() &&
    new Date(ts).getMonth() === yesterday.getMonth() &&
    new Date(ts).getFullYear() === yesterday.getFullYear()
  ) {
    return '昨天'
  }
  if (days < 7) return `${days}天前`
  if (weeks < 5) return `${weeks}周前`
  const d = new Date(ts)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

function GoalMini({ secs, goalMin }: { secs: number; goalMin: number }) {
  const mins = Math.floor(secs / 60)
  const pct = Math.min(100, Math.round((mins / goalMin) * 100))
  return (
    <span className={`goal-mini ${pct >= 100 ? 'complete' : ''}`}>
      <Target size={12} /> {mins}m / {goalMin}m
    </span>
  )
}

interface BookShelfProps {
  books: BookEntry[]
  readingTime: number
  onOpenBook: (filePath: string) => void
  onDelete: (filePath: string, deleteFile: boolean) => void
}

const FORMAT_LABELS: Record<string, string> = {
  epub: 'EPUB',
  txt: 'TXT',
  mobi: 'MOBI',
}

const BookCard = memo(function BookCard({ book, i, onOpenBook, onManageBook }: {
  book: BookEntry; i: number; onOpenBook: (fp: string) => void; onManageBook: (fp: string) => void
}) {
  const [c1, c2] = colors[i % colors.length]
  const coverUrl = useBookCover(book.filePath, book.meta.coverMime)

  const displayCover = coverUrl ?? book.meta.cover
  const format = book.format || 'epub' // default to epub for backward compat
  const formatLabel = FORMAT_LABELS[format] || format.toUpperCase()
  return (
    <article
      className="book-card"
      onContextMenu={e => { e.preventDefault(); onManageBook(book.filePath) }}
    >
      <button type="button" className="book-card-open-control"
        onClick={() => onOpenBook(book.filePath)}
        aria-label={`打开《${book.meta.title}》`}
      />
      <button type="button" className="book-card-menu-btn"
        onClick={() => onManageBook(book.filePath)}
        aria-label={`管理《${book.meta.title}》`}
        title="管理书籍"
      ><MoreVertical size={15} /></button>
      <div className={`book-cover-container ${!displayCover ? 'book-cover-gradient' : ''}`}
        style={!displayCover ? { background: `linear-gradient(135deg, ${c1}, ${c2})` } : undefined}
      >
        {/* T13: format badge */}
        <div className="book-format-badge" title={`格式: ${formatLabel}`}>
          {formatLabel}
        </div>
        {displayCover ? (
          <img src={displayCover} alt={book.meta.title} className="book-cover-img" />
        ) : (
          <span className="book-cover-fallback"><BookOpen size={32} /></span>
        )}
        {book.progress !== undefined && (
          <div className="book-progress-bar" role="progressbar" aria-label="阅读进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={book.progress}>
            <div
              className="book-progress-fill"
              style={{ width: `${book.progress}%` }}
            />
          </div>
        )}
      </div>
      <div className="book-card-info">
        <div className="book-title" title={book.meta.title}>{book.meta.title}</div>
        <div className="book-author" title={book.meta.author}>{book.meta.author}</div>
        {book.chapterLabel && book.progress !== undefined && (
          <div className="book-chapter">
            {book.progress}% · {book.chapterLabel}
          </div>
        )}
        {book.lastOpenedAt && (
          <div className="book-timestamp">{formatRelativeTime(book.lastOpenedAt)}</div>
        )}
      </div>
    </article>
  )
})

const ContinueReadingCard = memo(function ContinueReadingCard({ book, onOpenBook }: { book: BookEntry; onOpenBook: (fp: string) => void }) {
  const coverUrl = useBookCover(book.filePath, book.meta.coverMime)

  const displayCover = coverUrl ?? book.meta.cover
  return (
    <article
      className="continue-reading-card"
    >
      <button type="button" className="continue-reading-open-control"
        onClick={() => onOpenBook(book.filePath)}
        aria-label={`继续阅读《${book.meta.title}》`}
      />
      <div className={`continue-reading-cover ${!displayCover ? 'book-cover-gradient' : ''}`}
      >
        {displayCover ? (
          <img src={displayCover} alt={book.meta.title} className="book-cover-img" />
        ) : (
          <span className="continue-reading-cover-fallback"><BookOpen size={32} /></span>
        )}
      </div>
      <div className="continue-reading-info">
        <div className="book-title" title={book.meta.title}>{book.meta.title}</div>
        <div className="book-author" title={book.meta.author}>{book.meta.author}</div>
        {book.progress !== undefined && (
          <div className="continue-reading-progress">
            <div className="continue-reading-progress-bar" role="progressbar" aria-label="阅读进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={book.progress}>
              <div
                className="continue-reading-progress-fill"
                style={{ width: `${book.progress}%` }}
              />
            </div>
            <div className="continue-reading-progress-meta">
              <span>{book.progress}%</span>
              {book.chapterLabel && <span className="book-chapter">{book.chapterLabel}</span>}
            </div>
          </div>
        )}
      </div>
    </article>
  )
})

export function BookShelf({ books, readingTime, onOpenBook, onDelete }: BookShelfProps) {
  const [confirmPath, setConfirmPath] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>('recent')
  const [searchQuery, setSearchQuery] = useState('')
  const [goalMin, setGoalMin] = useState(0)
  const recentScrollRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const dialogTriggerRef = useRef<HTMLElement | null>(null)

  const openManageDialog = (filePath: string) => {
    dialogTriggerRef.current = document.activeElement as HTMLElement | null
    setConfirmPath(filePath)
  }

  const closeManageDialog = () => {
    setConfirmPath(null)
    requestAnimationFrame(() => dialogTriggerRef.current?.focus())
  }

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeManageDialog()
      return
    }
    if (event.key !== 'Tab' || !dialogRef.current) return
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
  useEffect(() => {
    loadSetting('readingGoal').then((v) => {
      if (v) {
        try { setGoalMin(JSON.parse(v).dailyMinutes || 0) } catch { setGoalMin(0) }
      }
    })
  }, [])

  const recentBooks = useMemo(() => [...books]
    .filter(b => b.lastOpenedAt)
    .sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))
    .slice(0, 5)
  , [books])

  const recentSet = useMemo(() => new Set(recentBooks.map(b => b.filePath)), [recentBooks])
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const sortedBooks = useMemo(() => [...books]
    .filter(b => {
      if (normalizedQuery) {
        return b.meta.title.toLowerCase().includes(normalizedQuery) || b.meta.author.toLowerCase().includes(normalizedQuery)
      }
      return !recentSet.has(b.filePath)
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        const ta = a.lastOpenedAt ?? 0
        const tb = b.lastOpenedAt ?? 0
        return tb - ta
      }
      const va = sortBy === 'title' ? a.meta.title : a.meta.author
      const vb = sortBy === 'title' ? b.meta.title : b.meta.author
      return va.localeCompare(vb, 'zh-CN')
    })
  , [books, normalizedQuery, sortBy, recentSet])

  return (
    <div className="bookshelf">
      <div className="bookshelf-header">
        <div className="bookshelf-header-timer"><Timer size={16} /></div>
        <div>
          <div className="bookshelf-header-time">
            <span className="bookshelf-header-time-value">
              {Math.floor(readingTime / 3600)}h {Math.floor((readingTime % 3600) / 60)}m
            </span>
            {goalMin > 0 && <GoalMini secs={readingTime} goalMin={goalMin} />}
          </div>
          <div className="bookshelf-header-time-label">今日阅读</div>
        </div>
        <div className="bookshelf-header-spacer" />
        <input
          type="search"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索书名/作者..."
          className="search-input"
          aria-label="搜索书名或作者"
        />
        <div className="sort-controls">
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`sort-btn ${sortBy === opt.key ? 'active' : ''}`}
              aria-pressed={sortBy === opt.key}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      {recentBooks.length > 0 && !normalizedQuery && (
        <div className="continue-reading-section">
          <div className="continue-reading-heading">
            <div className="continue-reading-section-title"><BookOpen size={16} /> 继续阅读</div>
            {recentBooks.length > 1 && (
              <div className="continue-reading-controls">
                <button type="button" onClick={() => recentScrollRef.current?.scrollBy({ left: -270, behavior: 'smooth' })} aria-label="向左滚动继续阅读" title="向左滚动"><ChevronLeft size={15} /></button>
                <button type="button" onClick={() => recentScrollRef.current?.scrollBy({ left: 270, behavior: 'smooth' })} aria-label="向右滚动继续阅读" title="向右滚动"><ChevronRight size={15} /></button>
              </div>
            )}
          </div>
          <div ref={recentScrollRef} className="continue-reading-scroll">
            {recentBooks.map(book => (
              <ContinueReadingCard key={book.filePath} book={book} onOpenBook={onOpenBook} />
            ))}
          </div>
        </div>
      )}

      {books.length === 0 ? (
        <div className="bookshelf-empty">
          <div className="bookshelf-empty-content">
            <div className="bookshelf-empty-icon"><Library size={48} /></div>
            <p className="bookshelf-empty-title">还没有书</p>
            <p className="bookshelf-empty-desc">
              点击左侧「导入」<br/>或拖拽 EPUB 文件到窗口
            </p>
          </div>
        </div>
      ) : (
        <div className="bookshelf-grid">
          {normalizedQuery && sortedBooks.length === 0 ? (
            <div className="bookshelf-search-empty" role="status">
              <span>未找到与“{searchQuery.trim()}”匹配的书籍</span>
              <button type="button" onClick={() => setSearchQuery('')}>清除搜索</button>
            </div>
          ) : (
            <div className="bookshelf-grid-inner">
              {sortedBooks.map((book, i) => (
                <BookCard key={book.filePath} book={book} i={i}
                  onOpenBook={onOpenBook}
                  onManageBook={openManageDialog}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* confirm dialog */}
      {confirmPath && (
        <div className="delete-modal-overlay" onClick={closeManageDialog}>
          <div ref={dialogRef} className="delete-modal" role="dialog" aria-modal="true" aria-labelledby="book-manage-title" aria-describedby="book-manage-desc" onClick={e => e.stopPropagation()} onKeyDown={handleDialogKeyDown}>
            <div className="delete-modal-icon" aria-hidden="true"><Trash2 size={32} /></div>
            <h2 id="book-manage-title" className="delete-modal-title">管理书籍</h2>
            <p id="book-manage-desc" className="delete-modal-desc">可以仅移出书架，或同时删除本地文件。</p>
            <div className="delete-modal-actions">
              <button
                className="modal-btn modal-btn-delete"
                onClick={() => { onDelete(confirmPath, true); closeManageDialog() }}
              >删除文件并移出书架</button>
              <button
                className="modal-btn modal-btn-remove"
                onClick={() => { onDelete(confirmPath, false); closeManageDialog() }}
              >仅移出书架</button>
              <button
                className="modal-btn modal-btn-cancel"
                onClick={closeManageDialog}
                autoFocus
              >取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
