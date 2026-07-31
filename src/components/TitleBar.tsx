import '../styles/components/titlebar.css'
import { Minus, Square, X } from 'lucide-react'

export function TitleBar() {
  return (
    <div className="titlebar-drag titlebar-container">
      <span className="titlebar-label">CoolReader</span>
      <div className="titlebar-buttons titlebar-no-drag">
        <button
          onClick={() => window.electronAPI?.minimize()}
          className="titlebar-btn"
          aria-label="最小化"
          title="最小化"
        ><Minus size={14} /></button>
        <button
          onClick={() => window.electronAPI?.maximize()}
          className="titlebar-btn"
          aria-label="最大化或还原"
          title="最大化或还原"
        ><Square size={12} /></button>
        <button
          onClick={() => window.electronAPI?.close()}
          className="titlebar-btn close"
          aria-label="关闭"
          title="关闭"
        ><X size={16} /></button>
      </div>
    </div>
  )
}
