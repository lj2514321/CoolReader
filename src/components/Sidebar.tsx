import { useEffect, useRef } from 'react'
import { NavItem } from '../types'

interface SidebarProps {
  toc: NavItem[]
  activeHref: string
  onNavigate: (href: string) => void
  onClose: () => void
}

const btnRefs = new Map<string, HTMLElement>()

function TocList({ items, onNavigate, activeHref, depth = 0 }: {
  items: NavItem[]
  onNavigate: (href: string) => void
  activeHref: string
  depth?: number
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
                color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.55)',
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive ? '3px solid #a78bfa' : '3px solid transparent',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
            >{item.label}</button>
            {item.subitems?.length > 0 && (
              <TocList items={item.subitems} onNavigate={onNavigate} activeHref={activeHref} depth={depth + 1} />
            )}
          </span>
        )
      })}
    </>
  )
}

export function Sidebar({ toc, activeHref, onNavigate, onClose }: SidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

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
      background: 'rgba(10,10,26,0.8)',
      backdropFilter: 'blur(32px) saturate(140%)',
      WebkitBackdropFilter: 'blur(32px) saturate(140%)',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      zIndex: 10,
      alignSelf: 'stretch',
      minHeight: 0,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 16px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: 14 }}>目录</span>
        <button onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.06)', border: 'none',
            cursor: 'pointer', borderRadius: 8, padding: '4px 10px',
            color: 'rgba(255,255,255,0.5)', fontSize: 14,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        >✕</button>
      </div>
      <div ref={scrollRef} data-scroll style={{
        flex: 1, overflowY: 'auto', padding: '8px 0', minHeight: 0,
      }}>
        <TocList items={toc} onNavigate={onNavigate} activeHref={activeHref} />
      </div>
    </div>
  )
}
