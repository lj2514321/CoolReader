import { BookEntry } from '../types'

const styleId = '_app_base'
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const s = document.createElement('style')
  s.id = styleId
  s.textContent = [
    '*::-webkit-scrollbar{display:none}',
    '*{scrollbar-width:none;-ms-overflow-style:none}',
    '::selection{background:rgba(99,102,241,0.4);color:#fff}',
  ].join('')
  document.head.appendChild(s)
}

const glass = {
  background: 'rgba(255,255,255,0.07)',
  backdropFilter: 'blur(24px) saturate(140%)',
  WebkitBackdropFilter: 'blur(24px) saturate(140%)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
}

const btnGlass = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#fff',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600 as const,
  padding: '10px 24px',
  transition: 'all 0.2s ease',
}

interface LibraryProps {
  books: BookEntry[]
  onOpenBook: (filePath: string) => void
  onImport: () => void
}

const colors = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
]

export function Library({ books, onOpenBook, onImport }: LibraryProps) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1040 40%, #0d1137 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '0%', left: '20%', width: '60%', height: '60%', background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '0%', right: '0%', width: '50%', height: '40%', background: 'radial-gradient(ellipse, rgba(168,85,247,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{
        margin: '24px 28px 0',
        padding: '18px 28px',
        ...glass,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 1,
      }}>
        <div>
          <h1 style={{ margin: 0, color: '#fff', fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>书架</h1>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 400 }}>
            {books.length > 0 ? `${books.length} 本书` : ''}
          </p>
        </div>
        <button onClick={onImport} style={btnGlass}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.3)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
        >导入</button>
      </div>

      {books.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
          <div style={{ ...glass, padding: '56px 72px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 56, opacity: 0.5 }}>📚</div>
            <p style={{ fontSize: 20, fontWeight: 600, margin: 0, color: 'rgba(255,255,255,0.7)' }}>还没有书</p>
            <p style={{ fontSize: 14, margin: 0, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
              点击右上角「导入」<br/>或拖拽 EPUB 文件到窗口
            </p>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', padding: '32px 40px', zIndex: 1 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, 148px)',
            gap: '36px 28px',
            justifyContent: 'center',
          }}>
            {books.map((book, i) => {
              const [c1, c2] = colors[i % colors.length]
              return (
                <div key={book.filePath} onClick={() => onOpenBook(book.filePath)}
                  style={{
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = ''}
                >
                  <div style={{
                    width: 120, height: 170,
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                    background: !book.meta.cover ? `linear-gradient(135deg, ${c1}, ${c2})` : undefined,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {book.meta.cover ? (
                      <img src={book.meta.cover} alt={book.meta.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 40, opacity: 0.5 }}>📖</span>
                    )}
                  </div>
                  <div style={{
                    marginTop: 12, textAlign: 'center', width: 130,
                  }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      lineHeight: 1.3,
                    }}>{book.meta.title}</div>
                    <div style={{
                      fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{book.meta.author}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
