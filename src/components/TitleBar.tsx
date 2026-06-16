import '../styles/components/titlebar.css'
import { X } from 'lucide-react'

export function TitleBar() {
  return (
    <div className="titlebar-drag titlebar-container">
      <span className="titlebar-label">CoolReader</span>
      <div className="titlebar-buttons titlebar-no-drag">
        <button
          onClick={() => window.electronAPI?.minimize()}
          className="titlebar-btn"
        >&#x2013;</button>
        <button
          onClick={() => window.electronAPI?.maximize()}
          className="titlebar-btn"
          style={{ fontSize: 12 }}
        >□</button>
        <button
          onClick={() => window.electronAPI?.close()}
          className="titlebar-btn close"
        ><X size={16} /></button>
      </div>
    </div>
  )
}