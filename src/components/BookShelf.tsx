import { useState, useMemo, memo, useEffect } from 'react'
import { BookEntry } from '../types'
import { glass, colors } from '../utils/styles'
import { loadCover, loadSetting } from '../utils/db'

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
    <span style={{ fontSize: 12, color: pct >= 100 ? '#22c55e' : 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
      🎯 {mins}m / {goalMin}m
    </span>
  )
}

interface BookShelfProps {
  books: BookEntry[]
  readingTime: number
  onOpenBook: (filePath: string) => void
  onDelete: (filePath: string, deleteFile: boolean) => void
}

const BookCard = memo(function BookCard({ book, i, onOpenBook, onContextMenu }: {
  book: BookEntry; i: number; onOpenBook: (fp: string) => void; onContextMenu: (fp: string) => void
}) {
  const [c1, c2] = colors[i % colors.length]
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined)

  useEffect(() => {
    let active = true
    let url: string | undefined
    loadCover(book.filePath).then(record => {
      if (!active || !record) return
      const blob = new Blob([record.data], { type: record.mime ?? book.meta.coverMime ?? 'image/png' })
      url = URL.createObjectURL(blob)
      setCoverUrl(url)
    })
    return () => { active = false; if (url) URL.revokeObjectURL(url) }
  }, [book.filePath])

  const displayCover = coverUrl ?? book.meta.cover
  return (
    <div key={book.filePath} style={{
      position: 'relative',
      borderRadius: 14,
      background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.08) 100%)',
      border: '1px solid rgba(168,85,247,0.12)',
      padding: '20px 14px 18px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'pointer',
    }}
      onClick={() => onOpenBook(book.filePath)}
      onContextMenu={e => { e.preventDefault(); onContextMenu(book.filePath) }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.15)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{
        width: 120, height: 170,
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
        background: !displayCover ? `linear-gradient(135deg, ${c1}, ${c2})` : undefined,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
      }}>
        {displayCover ? (
          <img src={displayCover} alt={book.meta.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 40, opacity: 0.5 }}>📖</span>
        )}
        {book.progress !== undefined && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
            background: 'rgba(0,0,0,0.3)',
          }}>
            <div style={{
              width: `${book.progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, rgba(99,102,241,0.9), rgba(168,85,247,0.7))',
              borderRadius: '0 2px 2px 0',
              transition: 'width 0.3s ease',
            }} />
          </div>
        )}
      </div>
      <div style={{ marginTop: 14, textAlign: 'center', width: '100%' }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}>{book.meta.title}</div>
        <div style={{
          fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{book.meta.author}</div>
        {book.chapterLabel && book.progress !== undefined && (
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4,
            lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {book.progress}% · {book.chapterLabel}
          </div>
        )}
        {book.lastOpenedAt && (
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 6,
            lineHeight: 1.2,
          }}>{formatRelativeTime(book.lastOpenedAt)}</div>
        )}
      </div>
    </div>
  )
})

const ContinueReadingCard = memo(function ContinueReadingCard({ book, onOpenBook }: { book: BookEntry; onOpenBook: (fp: string) => void }) {
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined)

  useEffect(() => {
    let active = true
    let url: string | undefined
    loadCover(book.filePath).then(record => {
      if (!active || !record) return
      const blob = new Blob([record.data], { type: record.mime ?? book.meta.coverMime ?? 'image/png' })
      url = URL.createObjectURL(blob)
      setCoverUrl(url)
    })
    return () => { active = false; if (url) URL.revokeObjectURL(url) }
  }, [book.filePath])

  const displayCover = coverUrl ?? book.meta.cover
  return (
    <div onClick={() => onOpenBook(book.filePath)} style={{
      width: 260, flexShrink: 0,
      borderRadius: 12,
      background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(168,85,247,0.06) 100%)',
      border: '1px solid rgba(168,85,247,0.1)',
      padding: 12,
      display: 'flex', gap: 12,
      cursor: 'pointer',
      transition: 'background 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(168,85,247,0.12) 100%)'}
      onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(168,85,247,0.06) 100%)'}
    >
      <div style={{
        width: 64, height: 90, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
        boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
        background: displayCover ? undefined : 'linear-gradient(135deg, #6366f1, #a855f7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        {displayCover ? (
          <img src={displayCover} alt={book.meta.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 24, opacity: 0.5 }}>📖</span>
        )}
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {book.meta.title}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {book.meta.author}
        </div>
        {book.progress !== undefined && (
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{
                width: `${book.progress}%`, height: '100%', borderRadius: 2,
                background: 'linear-gradient(90deg, rgba(99,102,241,0.8), rgba(168,85,247,0.6))',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3, display: 'flex', justifyContent: 'space-between' }}>
              <span>{book.progress}%</span>
              {book.chapterLabel && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{book.chapterLabel}</span>}
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        margin: '24px 28px 0 24px',
        padding: '14px 24px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.1) 100%)',
        borderRadius: 14,
        border: '1px solid rgba(168,85,247,0.15)',
        display: 'flex', alignItems: 'center', gap: 16,
        flexShrink: 0,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>⏱</div>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: -0.3, lineHeight: 1.3 }}>
              {Math.floor(readingTime / 3600)}h {Math.floor((readingTime % 3600) / 60)}m
            </span>
            {goalMin > 0 && <GoalMini secs={readingTime} goalMin={goalMin} />}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginTop: 1 }}>
            今日阅读
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索书名/作者..."
          style={{
            width: 140, padding: '6px 10px', borderRadius: 8, fontSize: 12,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {sortOptions.map((opt) => (
            <button key={opt.key} onClick={() => setSortBy(opt.key)}
              style={{
                padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: sortBy === opt.key
                  ? 'rgba(99,102,241,0.35)'
                  : 'rgba(255,255,255,0.06)',
                color: sortBy === opt.key ? '#fff' : 'rgba(255,255,255,0.45)',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { if (sortBy !== opt.key) { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' } }}
              onMouseLeave={e => { if (sortBy !== opt.key) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' } }}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      {recentBooks.length > 0 && (
        <div style={{
          margin: '16px 28px 0 24px',
          padding: '14px 20px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.05) 100%)',
          borderRadius: 14,
          border: '1px solid rgba(168,85,247,0.08)',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
            📖 继续阅读
          </div>
          <div style={{
            display: 'flex', gap: 10,
            overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none',
            paddingBottom: 4,
          }}>
            {recentBooks.map(book => (
              <ContinueReadingCard key={book.filePath} book={book} onOpenBook={onOpenBook} />
            ))}
          </div>
        </div>
      )}

      {books.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ ...glass, padding: '56px 72px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 56, opacity: 0.5 }}>📚</div>
            <p style={{ fontSize: 20, fontWeight: 600, margin: 0, color: 'rgba(255,255,255,0.7)' }}>还没有书</p>
            <p style={{ fontSize: 14, margin: 0, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
              点击左侧「导入」<br/>或拖拽 EPUB 文件到窗口
            </p>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', padding: '28px 36px 32px 24px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, 148px)',
            gap: '36px 28px',
            justifyContent: 'center',
          }}>
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
        <div onClick={() => setConfirmPath(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'rgba(15,12,41,0.9)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 16, padding: '32px 36px',
            border: '1px solid rgba(255,255,255,0.08)',
            textAlign: 'center', maxWidth: 340,
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗑</div>
            <p style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>确认删除</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 20px', lineHeight: 1.5 }}>
              删除后将无法恢复
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => { onDelete(confirmPath, true); setConfirmPath(null) }}
                style={{
                  padding: '10px 20px', cursor: 'pointer', borderRadius: 10,
                  background: 'rgba(220,38,38,0.3)', border: '1px solid rgba(220,38,38,0.3)',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.5)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(220,38,38,0.3)'}
              >删除文件并移出书架</button>
              <button onClick={() => { onDelete(confirmPath, false); setConfirmPath(null) }}
                style={{
                  padding: '10px 20px', cursor: 'pointer', borderRadius: 10,
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              >仅移出书架</button>
              <button onClick={() => setConfirmPath(null)}
                style={{
                  padding: '8px', cursor: 'pointer', borderRadius: 10,
                  background: 'none', border: 'none',
                  color: 'rgba(255,255,255,0.3)', fontSize: 12,
                  marginTop: 4,
                }}
              >取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
