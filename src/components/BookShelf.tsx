import { useState, useMemo, memo, useEffect } from 'react'
import { BookEntry } from '../types'
import { loadSetting } from '../utils/db'
import { BookOpen, Timer, Library, Trash2, Target } from 'lucide-react'
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

const BookCard = memo(function BookCard({ book, i, onOpenBook, onContextMenu }: {
  book: BookEntry; i: number; onOpenBook: (fp: string) => void; onContextMenu: (fp: string) => void
}) {
  const [c1, c2] = colors[i % colors.length]
  const coverUrl = useBookCover(book.filePath, book.meta.coverMime)

  const displayCover = coverUrl ?? book.meta.cover
  const format = book.format || 'epub' // default to epub for backward compat
  const formatLabel = FORMAT_LABELS[format] || format.toUpperCase()
  return (
    <div
      className="book-card"
      onClick={() => onOpenBook(book.filePath)}
      onContextMenu={e => { e.preventDefault(); onContextMenu(book.filePath) }}
    >
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
          <div className="book-progress-bar">
            <div
              className="book-progress-fill"
              style={{ width: `${book.progress}%` }}
            />
          </div>
        )}
      </div>
      <div className="book-card-info">
        <div className="book-title">{book.meta.title}</div>
        <div className="book-author">{book.meta.author}</div>
        {book.chapterLabel && book.progress !== undefined && (
          <div className="book-chapter">
            {book.progress}% · {book.chapterLabel}
          </div>
        )}
        {book.lastOpenedAt && (
          <div className="book-timestamp">{formatRelativeTime(book.lastOpenedAt)}</div>
        )}
      </div>
    </div>
  )
})

const ContinueReadingCard = memo(function ContinueReadingCard({ book, onOpenBook }: { book: BookEntry; onOpenBook: (fp: string) => void }) {
  const coverUrl = useBookCover(book.filePath, book.meta.coverMime)

  const displayCover = coverUrl ?? book.meta.cover
  return (
    <div
      className="continue-reading-card"
      onClick={() => onOpenBook(book.filePath)}
    >
      <div className={`continue-reading-cover ${!displayCover ? 'book-cover-gradient' : ''}`}
      >
        {displayCover ? (
          <img src={displayCover} alt={book.meta.title} className="book-cover-img" />
        ) : (
          <span className="continue-reading-cover-fallback"><BookOpen size={32} /></span>
        )}
      </div>
      <div className="continue-reading-info">
        <div className="book-title">{book.meta.title}</div>
        <div className="book-author">{book.meta.author}</div>
        {book.progress !== undefined && (
          <div className="continue-reading-progress">
            <div className="continue-reading-progress-bar">
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
    </div>
  )
})

export function BookShelf({ books, readingTime, onOpenBook, onDelete }: BookShelfProps) {
  const [confirmPath, setConfirmPath] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>('recent')
  const [searchQuery, setSearchQuery] = useState('')
  const [goalMin, setGoalMin] = useState(0)
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

  const sortedBooks = useMemo(() => [...books]
    .filter(b => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        if (!b.meta.title.toLowerCase().includes(q) && !b.meta.author.toLowerCase().includes(q)) return false
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
  , [books, searchQuery, sortBy, recentSet])

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
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索书名/作者..."
          className="search-input"
        />
        <div className="sort-controls">
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`sort-btn ${sortBy === opt.key ? 'active' : ''}`}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      {recentBooks.length > 0 && (
        <div className="continue-reading-section">
          <div className="continue-reading-section-title"><BookOpen size={16} /> 继续阅读</div>
          <div className="continue-reading-scroll">
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
          <div className="bookshelf-grid-inner">
            {sortedBooks.map((book, i) => (
              <BookCard key={book.filePath} book={book} i={i}
                onOpenBook={onOpenBook}
                onContextMenu={setConfirmPath}
              />
            ))}
          </div>
        </div>
      )}

      {/* confirm dialog */}
      {confirmPath && (
        <div className="delete-modal-overlay" onClick={() => setConfirmPath(null)}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <div className="delete-modal-icon"><Trash2 size={40} /></div>
            <p className="delete-modal-title">确认删除</p>
            <p className="delete-modal-desc">删除后将无法恢复</p>
            <div className="delete-modal-actions">
              <button
                className="modal-btn modal-btn-delete"
                onClick={() => { onDelete(confirmPath, true); setConfirmPath(null) }}
              >删除文件并移出书架</button>
              <button
                className="modal-btn modal-btn-remove"
                onClick={() => { onDelete(confirmPath, false); setConfirmPath(null) }}
              >仅移出书架</button>
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => setConfirmPath(null)}
              >取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}