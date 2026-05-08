export function TitleBar() {
  return (
    <div style={{
      height: 36,
      background: 'rgba(10,10,26,0.6)',
      backdropFilter: 'blur(24px) saturate(140%)',
      WebkitBackdropFilter: 'blur(24px) saturate(140%)',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      userSelect: 'none',
      flexShrink: 0,
    }} className="titlebar-drag">
      <span style={{
        fontSize: 12,
        color: 'rgba(255,255,255,0.3)',
        marginLeft: 16,
        fontWeight: 500,
        letterSpacing: 0.3,
      }}>EPUB Reader</span>
      <div style={{ display: 'flex', height: '100%' }} className="titlebar-no-drag">
        <button
          onClick={() => window.electronAPI?.minimize()}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            width: 44, height: '100%', color: 'rgba(255,255,255,0.4)',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >&#x2013;</button>
        <button
          onClick={() => window.electronAPI?.maximize()}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            width: 44, height: '100%', color: 'rgba(255,255,255,0.4)',
            fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >□</button>
        <button
          onClick={() => window.electronAPI?.close()}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            width: 44, height: '100%', color: 'rgba(255,255,255,0.4)',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#e81123'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
        >✕</button>
      </div>
    </div>
  )
}
