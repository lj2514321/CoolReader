import './SidebarNav.css'
import { Library, BarChart3, Settings, Download } from 'lucide-react'

export type LibPage = 'books' | 'settings' | 'stats'

interface SidebarNavProps {
  libPage: LibPage
  bookCount: number
  onSwitchPage: (target: LibPage) => void
  onImport: () => void
}

export function SidebarNav({ libPage, bookCount, onSwitchPage, onImport }: SidebarNavProps) {
  return (
    <aside className="sidebar-nav-container" aria-label="应用导航">
      <div>
        <h1 style={{ margin: 0, color: 'var(--nav-title-color)', fontSize: 22, fontWeight: 700, letterSpacing: 0, transition: 'color 0.3s ease' }}>CoolReader</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--nav-subtitle-color)', fontSize: 13, fontWeight: 400, transition: 'color 0.3s ease' }}>
          {bookCount > 0 ? `${bookCount} 本` : ''}
        </p>
      </div>
      <nav aria-label="主导航" style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, justifyContent: 'flex-start', paddingTop: 20 }}>
        <button
          onClick={() => onSwitchPage('books')}
          className={libPage === 'books' ? 'nav-btn active' : 'nav-btn'}
          aria-current={libPage === 'books' ? 'page' : undefined}
        >
          <span className="nav-icon"><Library size={16} /></span><span>书架</span>
        </button>
        <button
          onClick={() => onSwitchPage('stats')}
          className={libPage === 'stats' ? 'nav-btn active' : 'nav-btn'}
          aria-current={libPage === 'stats' ? 'page' : undefined}
        >
          <span className="nav-icon"><BarChart3 size={16} /></span><span>统计</span>
        </button>
        <button
          onClick={() => onSwitchPage('settings')}
          className={libPage === 'settings' ? 'nav-btn active' : 'nav-btn'}
          aria-current={libPage === 'settings' ? 'page' : undefined}
        >
          <span className="nav-icon"><Settings size={16} /></span><span>设置</span>
        </button>
      </nav>
      <div>
        <button onClick={onImport} className="nav-btn">
          <span className="nav-icon"><Download size={16} /></span><span>导入</span>
        </button>
      </div>
    </aside>
  )
}
