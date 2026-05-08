import { NavItem } from '../types'

interface SidebarProps {
  toc: NavItem[]
  onNavigate: (href: string) => void
  onClose: () => void
}

function TocList({ items, onNavigate, depth = 0 }: {
  items: NavItem[]
  onNavigate: (href: string) => void
  depth?: number
}) {
  return (
    <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
      {items.map(item => (
        <li key={item.href}>
          <button onClick={() => onNavigate(item.href)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              textAlign: 'left', padding: '7px 16px', paddingLeft: 16 + depth * 16,
              width: '100%', color: 'rgba(255,255,255,0.55)', fontSize: 13,
              borderRadius: 0, transition: 'all 0.1s ease',
              lineHeight: 1.4,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
          >{item.label}</button>
          {item.subitems?.length > 0 && (
            <TocList items={item.subitems} onNavigate={onNavigate} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  )
}

export function Sidebar({ toc, onNavigate, onClose }: SidebarProps) {
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
            transition: 'all 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
        >✕</button>
      </div>
      <div data-scroll style={{
        flex: 1, overflowY: 'auto', padding: '8px 0', minHeight: 0,
      }}>
        <TocList items={toc} onNavigate={onNavigate} />
      </div>
    </div>
  )
}
