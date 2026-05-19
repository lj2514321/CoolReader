import { useMemo } from 'react'
import { btnGlass } from '../utils/styles'

export type LibPage = 'books' | 'settings' | 'stats'

interface SidebarNavProps {
  libPage: LibPage
  bookCount: number
  onSwitchPage: (target: LibPage) => void
  onImport: () => void
}

export function SidebarNav({ libPage, bookCount, onSwitchPage, onImport }: SidebarNavProps) {
  const bookActive = libPage === 'books'
  const statsActive = libPage === 'stats'
  const settingActive = libPage === 'settings'

  const bookBtnStyle = useMemo(() => ({
    ...btnGlass, textAlign: 'center' as const,
    background: bookActive ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
    borderColor: bookActive ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)',
  }), [bookActive])
  const statsBtnStyle = useMemo(() => ({
    ...btnGlass, textAlign: 'center' as const,
    background: statsActive ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
    borderColor: statsActive ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)',
  }), [statsActive])
  const settingBtnStyle = useMemo(() => ({
    ...btnGlass, textAlign: 'center' as const,
    background: settingActive ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
    borderColor: settingActive ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)',
  }), [settingActive])

  const hoverIn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'rgba(99,102,241,0.3)'
    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'
  }
  const hoverOut = (btnPage: LibPage) => (e: React.MouseEvent<HTMLButtonElement>) => {
    const active = libPage === btnPage
    e.currentTarget.style.background = active ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'
    e.currentTarget.style.borderColor = active ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'
  }

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
    }}>
      <div>
        <h1 style={{ margin: 0, color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>CoolReader</h1>
        <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 400 }}>
          {bookCount > 0 ? `${bookCount} 本` : ''}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, justifyContent: 'flex-start', paddingTop: 20 }}>
        <button onClick={() => onSwitchPage('books')} style={bookBtnStyle}
          onMouseEnter={hoverIn}
          onMouseLeave={hoverOut('books')}
        >📚 书架</button>
        <button onClick={() => onSwitchPage('stats')} style={statsBtnStyle}
          onMouseEnter={hoverIn}
          onMouseLeave={hoverOut('stats')}
        >📊 统计</button>
        <button onClick={() => onSwitchPage('settings')} style={settingBtnStyle}
          onMouseEnter={hoverIn}
          onMouseLeave={hoverOut('settings')}
        >⚙ 设置</button>
      </div>
      <div>
        <button onClick={onImport} style={btnGlass}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.3)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
        >📥 导入</button>
      </div>
    </div>
  )
}
