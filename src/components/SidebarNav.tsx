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
    <div style={{
      margin: '24px 0 24px 24px',
      padding: '28px 24px',
      width: 160,
      borderRadius: 14,
      background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.1) 100%)',
      border: '1px solid rgba(168,85,247,0.15)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      zIndex: 1, flexShrink: 0,
      overflow: 'hidden',
    }}>
      <div>
        <h1 style={{ margin: 0, color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>CoolReader</h1>
        <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 400 }}>
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