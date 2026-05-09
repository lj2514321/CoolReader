import { useEffect, useRef, useState } from 'react'
import { BookMeta, ThemeMode } from '../types'

interface ReaderProps {
  filePath: string | null
  meta: BookMeta | null
  theme: ThemeMode
  progress: number
  onLoad: (path: string) => void
  onBack: () => void
  onNext: () => void
  onPrev: () => void
  onToggleSidebar: () => void
  onThemeChange: (t: ThemeMode) => void
  onSeek: (pct: number) => void
}

const themes: { key: ThemeMode; icon: string }[] = [
  { key: 'light', icon: '☀' },
  { key: 'sepia', icon: '☕' },
  { key: 'dark', icon: '◉' },
]

const themeBg: Record<ThemeMode, string> = {
  light: '#ece8f4',
  sepia: '#f4ecd8',
  dark: '#0a0a1a',
}

const glass = (dark: boolean) => ({
  background: dark ? 'rgba(15,12,41,0.45)' : 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(20px) saturate(140%)',
  WebkitBackdropFilter: 'blur(20px) saturate(140%)',
})

const btn = (fg: string) => ({
  background: 'none',
  border: 'none',
  cursor: 'pointer' as const,
  color: fg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 10,
  padding: '7px 14px',
  fontSize: 13,
  fontWeight: 600 as const,
  opacity: 0.7,
  transition: 'all 0.15s ease',
})

export function Reader({
  filePath, meta, theme, progress, onLoad, onBack, onNext, onPrev, onToggleSidebar, onThemeChange, onSeek,
}: ReaderProps) {
  const nextRef = useRef(onNext)
  const prevRef = useRef(onPrev)
  nextRef.current = onNext
  prevRef.current = onPrev

  const loadedRef = useRef(false)
  useEffect(() => {
    if (!filePath) {
      loadedRef.current = false
      return
    }
    if (!loadedRef.current) {
      loadedRef.current = true
      onLoad(filePath)
    }
  }, [filePath, onLoad])

  const [showUI, setShowUI] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()
  const wheelTimer = useRef<ReturnType<typeof setTimeout>>()

  const showControls = () => {
    setShowUI(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowUI(false), 3000)
  }

  useEffect(() => {
    showControls()
    return () => clearTimeout(hideTimer.current)
  }, [])

  useEffect(() => {
    const handler = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('[data-scroll]')) return
      e.preventDefault()
      if (wheelTimer.current) return
      wheelTimer.current = setTimeout(() => { wheelTimer.current = undefined }, 200)
      if (e.deltaY > 0) nextRef.current()
      else if (e.deltaY < 0) prevRef.current()
    }
    window.addEventListener('wheel', handler, { passive: false })
    return () => {
      window.removeEventListener('wheel', handler)
      clearTimeout(wheelTimer.current)
    }
  }, [])

  const handleViewerClick = (e: React.MouseEvent) => {
    const iframe = document.querySelector<HTMLIFrameElement>('#viewer iframe')
    if (iframe?.contentDocument) {
      const r = iframe.getBoundingClientRect()
      const el = iframe.contentDocument.elementFromPoint(e.clientX - r.left, e.clientY - r.top)
      const link = el?.closest('a')
      if (link?.getAttribute('href')) {
        link.click()
        return
      }
    }

    const x = e.clientX - e.currentTarget.getBoundingClientRect().left
    const w = e.currentTarget.getBoundingClientRect().width
    if (x < w * 0.22) { prevRef.current(); showControls(); return }
    if (x > w * 0.78) { nextRef.current(); showControls(); return }

    setShowUI(v => !v)
    clearTimeout(hideTimer.current)
  }

  const dark = theme === 'dark'
  const fg = dark ? '#c8c8e0' : '#2d2b55'

  return (
    <div style={{ height: '100%', background: themeBg[theme], overflow: 'hidden', position: 'relative' }}>
      <div id="viewer" style={{ position: 'absolute', inset: 0 }} />
      <div
        onClick={handleViewerClick}
        onKeyDown={e => {
          if (e.key === 'ArrowRight') { e.preventDefault(); nextRef.current() }
          if (e.key === 'ArrowLeft') { e.preventDefault(); prevRef.current() }
        }}
        tabIndex={0}
        style={{ position: 'absolute', inset: 0, zIndex: 1, outline: 'none' }}
      />

      {/* top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '12px 16px',
        opacity: showUI ? 1 : 0,
        pointerEvents: showUI ? 'auto' : 'none',
        transition: 'opacity 0.3s ease',
        zIndex: 2,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          borderRadius: 14, padding: '8px 14px',
          ...glass(dark),
        }}>
          <button onClick={onBack} style={btn(fg)}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
          >←&ensp;返回</button>
          <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {meta?.title || ''}
          </span>
          <button onClick={onToggleSidebar} style={btn(fg)}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
          >目录</button>
          {themes.map(t => (
            <button key={t.key} onClick={() => onThemeChange(t.key)}
              style={{
                ...btn(fg),
                padding: '7px 10px',
                background: theme === t.key ? 'rgba(99,102,241,0.3)' : 'transparent',
                opacity: 1,
                fontWeight: theme === t.key ? 700 : 400,
              }}
            >{t.icon}</button>
          ))}
        </div>
      </div>

      {/* bottom bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '12px 16px',
        opacity: showUI ? 1 : 0,
        pointerEvents: showUI ? 'auto' : 'none',
        transition: 'opacity 0.3s ease',
        zIndex: 2,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          borderRadius: 14, padding: '8px 16px',
          ...glass(dark),
        }}>
          <button onClick={onPrev} style={btn(fg)}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
          >◂&ensp;上一页</button>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              onClick={e => {
                const r = e.currentTarget.getBoundingClientRect()
                onSeek(Math.round(((e.clientX - r.left) / r.width) * 100))
              }}
              style={{
                flex: 1, height: 5, borderRadius: 3,
                background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                cursor: 'pointer', overflow: 'hidden',
              }}
            >
              <div style={{
                width: `${progress}%`, height: '100%',
                background: `linear-gradient(90deg, ${dark ? '#6366f1' : '#6366f1'}, ${dark ? '#a855f7' : '#a855f7'})`,
                borderRadius: 3, transition: 'width 0.2s ease',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)',
                  width: 10, height: 10, borderRadius: '50%',
                  background: '#a855f7', boxShadow: '0 0 6px rgba(168,85,247,0.5)',
                  opacity: 0.6,
                }} />
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: fg, opacity: 0.5, minWidth: 32, textAlign: 'right' }}>{progress}%</span>
          </div>

          <button onClick={onNext} style={btn(fg)}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
          >下一页&ensp;▸</button>
        </div>
      </div>
    </div>
  )
}
