import { useEffect, useRef } from 'react'
import { NavItem, ThemeMode } from '../types'
import { X } from 'lucide-react'
import '../styles/components/sidebar.css'

interface SidebarProps {
  toc: NavItem[]
  activeHref: string
  onNavigate: (href: string) => void
  onClose: () => void
  theme?: ThemeMode
  open?: boolean
}

function TocList({ items, onNavigate, activeHref, depth = 0, btnRefs }: {
  items: NavItem[]
  onNavigate: (href: string) => void
  activeHref: string
  depth?: number
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
              className={`sidebar-toc-btn${isActive ? ' sidebar-toc-btn-active' : ''} sidebar-toc-btn-depth-${depth}`}
              aria-current={isActive ? 'location' : undefined}
            >{item.label}</button>
            {(item.subitems ?? []).length > 0 && (
              <TocList items={item.subitems ?? []} onNavigate={onNavigate} activeHref={activeHref} depth={depth + 1} btnRefs={btnRefs} />
            )}
          </span>
        )
      })}
    </>
  )
}

export function Sidebar({ toc, activeHref, onNavigate, onClose, theme = 'dark', open = true }: SidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const btnRefsRef = useRef(new Map<string, HTMLElement>())
  const btnRefs = btnRefsRef.current

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
    <div data-theme={theme === 'custom' ? 'light' : theme} className={`sidebar-root${open ? ' sidebar-root-open' : ''}`}>
      <div className="sidebar-header">
        <span className="sidebar-header-title">目录</span>
        <button onClick={onClose} className="sidebar-close-btn" aria-label="关闭目录" title="关闭目录"><X size={16} /></button>
      </div>
      <div ref={scrollRef} data-scroll className="sidebar-scroll">
        <TocList items={toc} onNavigate={onNavigate} activeHref={activeHref} btnRefs={btnRefs} />
      </div>
    </div>
  )
}
