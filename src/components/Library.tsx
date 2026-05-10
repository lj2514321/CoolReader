import { useState, useEffect, useRef } from 'react'
import { BookEntry } from '../types'
import { loadSetting } from '../utils/db'
import { bgPresets, defGrad } from '../utils/styles'
import { SidebarNav } from './SidebarNav'
import { BookShelf } from './BookShelf'
import { SettingsPage } from './SettingsPage'

interface LibraryProps {
  books: BookEntry[]
  readingTime: number
  onOpenBook: (filePath: string) => void
  onImport: () => void
  onDelete: (filePath: string, deleteFile: boolean) => void
  onBgChange?: (g: string) => void
}

export function Library({ books, readingTime, onOpenBook, onImport, onDelete, onBgChange }: LibraryProps) {
  const [libPage, setLibPage] = useState<'books' | 'settings'>('books')
  const [transition, setTransition] = useState<'idle' | 'out' | 'in'>('idle')
  const [direction, setDirection] = useState<'up' | 'down'>('up')
  const transRef = useRef<ReturnType<typeof setTimeout>>()
  const [bgKey, setBgKey] = useState('deepPurple')
  const [settingsResetKey, setSettingsResetKey] = useState(0)

  useEffect(() => {
    loadSetting('bgPreset').then((v) => {
      if (v) {
        setBgKey(v)
        const g = bgPresets.find((b) => b.key === v)?.gradient || defGrad
        onBgChange?.(g)
      } else {
        onBgChange?.(defGrad)
      }
    }).catch(() => onBgChange?.(defGrad))
  }, [onBgChange])

  const switchPage = (target: 'books' | 'settings') => {
    if (target === libPage || transition !== 'idle') return
    if (target === 'settings') setSettingsResetKey(k => k + 1)
    const dir = target === 'settings' ? 'up' : 'down'
    setDirection(dir)
    setTransition('out')
    clearTimeout(transRef.current)
    transRef.current = setTimeout(() => {
      setLibPage(target)
      setTransition('in')
      transRef.current = setTimeout(() => setTransition('idle'), 400)
    }, 400)
  }

  const pageAnim = (page: 'books' | 'settings'): { opacity: number; transform: string } => {
    const active = libPage === page
    const isNew = (direction === 'up' && page === 'settings') || (direction === 'down' && page === 'books')
    const outY = direction === 'up' ? -28 : 28
    const startY = direction === 'up' ? 28 : -28

    if (transition === 'idle') return { opacity: active ? 1 : 0, transform: 'translateY(0)' }
    if (transition === 'out') {
      if (active) return { opacity: 0, transform: `translateY(${outY}px)` }
      return { opacity: 0, transform: `translateY(${startY}px)` }
    }
    if (isNew) return { opacity: 1, transform: 'translateY(0)' }
    return { opacity: 0, transform: `translateY(${outY}px)` }
  }

  const handlePresetChange = (key: string, gradient: string) => {
    setBgKey(key)
    onBgChange?.(gradient)
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'row',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '0%', left: '20%', width: '60%', height: '60%', background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '0%', right: '0%', width: '50%', height: '40%', background: 'radial-gradient(ellipse, rgba(168,85,247,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <SidebarNav libPage={libPage} bookCount={books.length} onSwitchPage={switchPage} onImport={onImport} />

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', zIndex: 1 }}>
        {/* books page */}
        <div style={{
          position: 'absolute', inset: 0,
          transition: 'opacity 0.4s ease, transform 0.4s ease',
          pointerEvents: transition !== 'idle' || libPage !== 'books' ? 'none' : 'auto',
          ...pageAnim('books'),
        }}>
          <BookShelf books={books} readingTime={readingTime} onOpenBook={onOpenBook} onDelete={onDelete} />
        </div>

        {/* settings page */}
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
          pointerEvents: transition !== 'idle' || libPage !== 'settings' ? 'none' : 'auto',
          ...pageAnim('settings'),
        }}>
          <SettingsPage bgKey={bgKey} onPresetChange={handlePresetChange} resetKey={settingsResetKey} visible={libPage === 'settings'} />
        </div>
      </div>
    </div>
  )
}
