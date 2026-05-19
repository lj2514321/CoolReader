import { useEffect, useRef } from 'react'
import { NavItem, ThemeMode } from '../types'

const sbTheme: Record<ThemeMode, { bg: string; fg: string; muted: string; active: string; border: string; hoverBg: string }> = {
  dark:  { bg: 'rgba(10,10,26,0.85)', fg: 'rgba(255,255,255,0.7)', muted: 'rgba(255,255,255,0.5)', active: '#a78bfa', border: 'rgba(255,255,255,0.05)', hoverBg: 'rgba(255,255,255,0.04)' },
  light: { bg: 'rgba(255,255,255,0.85)', fg: 'rgba(30,30,60,0.7)', muted: 'rgba(30,30,60,0.5)', active: '#7c3aed', border: 'rgba(0,0,0,0.06)', hoverBg: 'rgba(0,0,0,0.04)' },
  sepia: { bg: 'rgba(244,236,216,0.9)', fg: 'rgba(80,50,20,0.7)', muted: 'rgba(80,50,20,0.5)', active: '#a67c00', border: 'rgba(80,50,20,0.1)', hoverBg: 'rgba(80,50,20,0.04)' },
}

interface SidebarProps {
  toc: NavItem[]
  activeHref: string
  onNavigate: (href: string) => void
  onClose: () => void
  theme?: ThemeMode
}

function TocList({ items, onNavigate, activeHref, depth = 0, s, btnRefs }: {
  items: NavItem[]
  onNavigate: (href: string) => void
  activeHref: string
  depth?: number
  s: typeof sbTheme.dark
  btnRefs: Map<string, HTMLElement>
}) {
  return (
    <>
      {items.map((item) => {
        const isActive = !!activeHref && (
          item.href === activeHref ||
          item.href.endsWith(activeHref) ||
          activeHref.endsWith(item.href)
        )
        return (
          <span key={item.href}>
            <button
              ref={(el) => { if (el) btnRefs.set(item.href, el); else btnRefs.delete(item.href) }}
              onClick={() => onNavigate(item.href)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left', padding: '7px 16px', paddingLeft: 16 + depth * 16,
                width: '100%', fontSize: 13, borderRadius: 0, lineHeight: 1.4,
                color: isActive ? s.active : s.muted,
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive ? `3px solid ${s.active}` : '3px solid transparent',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = s.hoverBg; if (!isActive) e.currentTarget.style.color = s.fg }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; if (!isActive) e.currentTarget.style.color = s.muted }}
            >{item.label}</button>
            {item.subitems?.length > 0 && (
              <TocList items={item.subitems} onNavigate={onNavigate} activeHref={activeHref} depth={depth + 1} s={s} btnRefs={btnRefs} />
            )}
          </span>
        )
      })}
    </>
  )
}

export function Sidebar({ toc, activeHref, onNavigate, onClose, theme = 'dark' }: SidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const btnRefsRef = useRef(new Map<string, HTMLElement>())
  const btnRefs = btnRefsRef.current
  const s = sbTheme[theme]

  // reset ref map when book changes
  const tocKey = useRef(0)
  if (tocKey.current !== toc.length) {
    tocKey.current = toc.length
    btnRefs.clear()
  }

  useEffect(() => {
    if (!activeHref || !scrollRef.current) return
    // try all three match patterns
    const key = [activeHref]
    for (const [k, v] of btnRefs) {
      if (k === activeHref || k.endsWith(activeHref) || activeHref.endsWith(k)) {
        key[0] = k
        break
      }
    }
    const el = btnRefs.get(key[0])
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [activeHref])

  return (
    <div style={{
      width: 280,
      display: 'flex',
      flexDirection: 'column',
      background: s.bg,
      backdropFilter: 'blur(32px) saturate(140%)',
      WebkitBackdropFilter: 'blur(32px) saturate(140%)',
      borderRight: `1px solid ${s.border}`,
      zIndex: 10,
      alignSelf: 'stretch',
      minHeight: 0,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 16px 14px',
        borderBottom: `1px solid ${s.border}`,
      }}>
        <span style={{ color: s.fg, fontWeight: 600, fontSize: 14 }}>目录</span>
        <button onClick={onClose}
          style={{
            background: s.hoverBg, border: 'none',
            cursor: 'pointer', borderRadius: 8, padding: '4px 10px',
            color: s.muted, fontSize: 14,
          }}
          onMouseEnter={e => e.currentTarget.style.background = s.border}
          onMouseLeave={e => e.currentTarget.style.background = s.hoverBg}
        >✕</button>
      </div>
      <div ref={scrollRef} data-scroll style={{
        flex: 1, overflowY: 'auto', padding: '8px 0', minHeight: 0,
      }}>
        <TocList items={toc} onNavigate={onNavigate} activeHref={activeHref} s={s} btnRefs={btnRefs} />
      </div>
    </div>
  )
}
