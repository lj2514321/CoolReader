import { useState, useEffect, useRef } from 'react'
import { BookEntry } from '../types'
import { saveSetting, loadSetting } from '../utils/db'

interface LibraryProps {
  books: BookEntry[]
  readingTime: number
  onOpenBook: (filePath: string) => void
  onImport: () => void
  onDelete: (filePath: string, deleteFile: boolean) => void
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
  position: 'relative',
  zIndex: 2,
  transition: 'all 0.2s ease',
}

const colors = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
]

const bgPresets = [
  { key: 'deepPurple', label: '深紫', gradient: 'linear-gradient(135deg, #0a0a1a 0%, #1a1040 40%, #0d1137 100%)' },
  { key: 'midnight', label: '午夜蓝', gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
  { key: 'emerald', label: '翡翠', gradient: 'linear-gradient(135deg, #0a1a0f 0%, #1a4030 50%, #0d3727 100%)' },
  { key: 'amber', label: '琥珀', gradient: 'linear-gradient(135deg, #1a150a 0%, #403520 50%, #372d17 100%)' },
  { key: 'slate', label: '石板', gradient: 'linear-gradient(135deg, #0f111a 0%, #1a1d2e 50%, #111827 100%)' },
  { key: 'crimson', label: '绯红', gradient: 'linear-gradient(135deg, #1a0a0a 0%, #401025 50%, #370d1a 100%)' },
]

export function Library({ books, readingTime, onOpenBook, onImport, onDelete }: LibraryProps) {
  const [confirmPath, setConfirmPath] = useState<string | null>(null)
  const [libPage, setLibPage] = useState<'books' | 'settings'>('books')
  const [transition, setTransition] = useState<'idle' | 'out' | 'in'>('idle')
  const [direction, setDirection] = useState<'up' | 'down'>('up')
  const transRef = useRef<ReturnType<typeof setTimeout>>()
  const [bgKey, setBgKey] = useState('deepPurple')

  useEffect(() => {
    loadSetting('bgPreset').then((v) => { if (v) setBgKey(v) }).catch(() => {})
  }, [])

  const switchPage = (target: 'books' | 'settings') => {
    if (target === libPage || transition !== 'idle') return
    const dir = target === 'settings' ? 'up' : 'down'
    setDirection(dir)
    setTransition('out')
    clearTimeout(transRef.current)
    transRef.current = setTimeout(() => {
      setTransition('in')
      transRef.current = setTimeout(() => {
        setLibPage(target)
        setTransition('idle')
      }, 400)
    }, 400)
  }

  const pageAnim = (page: 'books' | 'settings'): { opacity: number; transform: string } => {
    const active = libPage === page
    const isNew = (direction === 'up' && page === 'settings') || (direction === 'down' && page === 'books')
    const outY = direction === 'up' ? -28 : 28
    const startY = direction === 'up' ? 28 : -28

    if (transition === 'idle') return { opacity: active ? 1 : 0, transform: 'translateY(0)' }
    if (transition === 'out') {
      if (active) return { opacity: 0, transform: `translateY(${outY}px)` }
      return { opacity: 0, transform: `translateY(${startY}px)` }
    }
    // 'in' — new page animates from startY to 0
    if (isNew) return { opacity: 1, transform: 'translateY(0)' }
    return { opacity: 0, transform: `translateY(${outY}px)` }
  }

  const bgGradient = bgPresets.find((b) => b.key === bgKey)?.gradient || bgPresets[0].gradient

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'row',
      background: bgGradient,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '0%', left: '20%', width: '60%', height: '60%', background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '0%', right: '0%', width: '50%', height: '40%', background: 'radial-gradient(ellipse, rgba(168,85,247,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{
        margin: '24px 0 24px 24px',
        padding: '28px 24px',
        width: 160,
        borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.1) 100%)',
        border: '1px solid rgba(168,85,247,0.15)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        zIndex: 1, flexShrink: 0,
      }}>
        <div>
          <h1 style={{ margin: 0, color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>CoolReader</h1>
          <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 400 }}>
            {books.length > 0 ? `${books.length} 本` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, justifyContent: 'flex-start', paddingTop: 20 }}>
          <button onClick={() => switchPage('books')} style={{
            ...btnGlass, textAlign: 'center',
            background: libPage === 'books' ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
            borderColor: libPage === 'books' ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)',
          }}
            onMouseEnter={e => { if (libPage !== 'books') { e.currentTarget.style.background = 'rgba(99,102,241,0.3)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' } }}
            onMouseLeave={e => { if (libPage !== 'books') { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' } }}
          >📚 书架</button>
          <button onClick={() => switchPage('settings')} style={{
            ...btnGlass, textAlign: 'center',
            background: libPage === 'settings' ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
            borderColor: libPage === 'settings' ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)',
          }}
            onMouseEnter={e => { if (libPage !== 'settings') { e.currentTarget.style.background = 'rgba(99,102,241,0.3)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' } }}
            onMouseLeave={e => { if (libPage !== 'settings') { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' } }}
          >⚙ 设置</button>
        </div>
        <div>
          <button onClick={onImport} style={btnGlass}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.3)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >📥 导入</button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', zIndex: 1 }}>
        {/* books page */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
          pointerEvents: transition !== 'idle' || libPage !== 'books' ? 'none' : 'auto',
          ...pageAnim('books'),
        }}>
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
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: -0.3, lineHeight: 1.3 }}>
                {Math.floor(readingTime / 3600)}h {Math.floor((readingTime % 3600) / 60)}m
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginTop: 1 }}>
                今日阅读
              </div>
            </div>
          </div>

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
                  {books.map((book, i) => {
                const [c1, c2] = colors[i % colors.length]
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
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.15)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <div style={{
                      width: 120, height: 170,
                      borderRadius: 10,
                      overflow: 'hidden',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
                      background: !book.meta.cover ? `linear-gradient(135deg, ${c1}, ${c2})` : undefined,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {book.meta.cover ? (
                        <img src={book.meta.cover} alt={book.meta.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 40, opacity: 0.5 }}>📖</span>
                      )}
                    </div>
                    <div style={{
                      marginTop: 14, textAlign: 'center', width: '100%',
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
                    {/* delete button */}
                    <div style={{ position: 'absolute', top: -6, right: -6, zIndex: 2 }}>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmPath(book.filePath) }}
                        style={{
                          width: 24, height: 24, borderRadius: '50%', border: 'none', cursor: 'pointer',
                          background: 'rgba(220,38,38,0.7)', color: '#fff', fontSize: 12, lineHeight: '24px',
                          textAlign: 'center', padding: 0, opacity: 0,
                          transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                      >✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        </div>

        {/* settings page */}
        <div style={{
          position: 'absolute', inset: 0, overflowY: 'auto',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
          pointerEvents: transition !== 'idle' || libPage !== 'settings' ? 'none' : 'auto',
          padding: '28px 36px 32px 24px',
          ...pageAnim('settings'),
        }}>
          <p style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '0 0 24px', letterSpacing: -0.3 }}>设置</p>

          <div style={{
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.08) 100%)',
            border: '1px solid rgba(168,85,247,0.12)',
            padding: '24px 28px',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600, margin: '0 0 16px' }}>首页背景</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {bgPresets.map((p) => (
                <button key={p.key} onClick={() => { setBgKey(p.key); saveSetting('bgPreset', p.key) }}
                  style={{
                    cursor: 'pointer', border: bgKey === p.key ? '2px solid rgba(168,85,247,0.7)' : '2px solid transparent',
                    borderRadius: 12, overflow: 'hidden', padding: 0,
                    transition: 'border-color 0.15s',
                    background: 'none',
                  }}
                >
                  <div style={{
                    height: 72, background: p.gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {bgKey === p.key && <span style={{ fontSize: 20, filter: 'invert(1) brightness(2)' }}>✓</span>}
                  </div>
                  <div style={{
                    padding: '8px 0', fontSize: 12, color: 'rgba(255,255,255,0.45)',
                    background: 'rgba(255,255,255,0.03)', textAlign: 'center',
                  }}>{p.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

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
