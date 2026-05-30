import './SidebarNav.css'

export type LibPage = 'books' | 'settings' | 'stats'

interface SidebarNavProps {
  libPage: LibPage
  bookCount: number
  onSwitchPage: (target: LibPage) => void
  onImport: () => void
}

export function SidebarNav({ libPage, bookCount, onSwitchPage, onImport }: SidebarNavProps) {
  return (
    <div className="sidebar-nav-container">
      <div>
        <h1 style={{ margin: 0, color: 'var(--nav-title-color)', fontSize: 22, fontWeight: 700, letterSpacing: -0.3, transition: 'color 0.3s ease' }}>CoolReader</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--nav-subtitle-color)', fontSize: 13, fontWeight: 400, transition: 'color 0.3s ease' }}>
          {bookCount > 0 ? `${bookCount} 本` : ''}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, justifyContent: 'flex-start', paddingTop: 20 }}>
        <button
          onClick={() => onSwitchPage('books')}
          className={libPage === 'books' ? 'nav-btn active' : 'nav-btn'}
        >
          <span className="nav-icon">📚</span><span>书架</span>
        </button>
        <button
          onClick={() => onSwitchPage('stats')}
          className={libPage === 'stats' ? 'nav-btn active' : 'nav-btn'}
        >
          <span className="nav-icon">📊</span><span>统计</span>
        </button>
        <button
          onClick={() => onSwitchPage('settings')}
          className={libPage === 'settings' ? 'nav-btn active' : 'nav-btn'}
        >
          <span className="nav-icon">⚙</span><span>设置</span>
        </button>
      </div>
      <div>
        <button onClick={onImport} className="nav-btn">
          <span className="nav-icon">📥</span><span>导入</span>
        </button>
      </div>
    </div>
  )
}