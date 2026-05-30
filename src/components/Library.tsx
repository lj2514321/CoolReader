import { useState, useEffect, useRef, useMemo } from 'react'
import { BookEntry, WebDAVConfig, AIConfig } from '../types'
import { loadSetting } from '../utils/db'
import { getPresets, defGrad, flatDefGrad } from '../utils/styles'
import { SidebarNav, LibPage } from './SidebarNav'
import { BookShelf } from './BookShelf'
import { SettingsPage } from './SettingsPage'
import { ReadingStats } from './ReadingStats'
import '../styles/components/library.css'

interface LibraryProps {
  uiTheme?: string
  books: BookEntry[]
  readingTime: number
  onOpenBook: (filePath: string) => void
  onImport: () => void
  onDelete: (filePath: string, deleteFile: boolean) => void
  onBgChange?: (g: string) => void
  webdavConfig?: WebDAVConfig | null
  onWebDAVConfigChange?: (config: WebDAVConfig | null) => void
  aiConfig?: AIConfig | null
  onAIConfigChange?: (config: AIConfig | null) => void
}

export function Library({ uiTheme = 'glass', books, readingTime, onOpenBook, onImport, onDelete, onBgChange, webdavConfig, onWebDAVConfigChange, aiConfig, onAIConfigChange }: LibraryProps) {
  const [libPage, setLibPage] = useState<LibPage>('books')
  const [transition, setTransition] = useState<'idle' | 'out' | 'in'>('idle')
  const [direction, setDirection] = useState<'up' | 'down' | 'left' | 'right'>('up')
  const transRef = useRef<ReturnType<typeof setTimeout>>()
  const [bgKey, setBgKey] = useState(() => uiTheme === 'flat' ? 'lightGray' : 'deepPurple')
  const [settingsResetKey, setSettingsResetKey] = useState(0)

  useEffect(() => {
    const dbKey = uiTheme === 'flat' ? 'bgPreset-flat' : 'bgPreset'
    const defaultKey = uiTheme === 'flat' ? 'lightGray' : 'deepPurple'
    const defaultGrad = uiTheme === 'flat' ? flatDefGrad : defGrad
    const presets = getPresets(uiTheme)
    
    loadSetting(dbKey).then((v) => {
      let presetKey = defaultKey
      if (v && presets.some((b) => b.key === v)) {
        presetKey = v
      }
      setBgKey(presetKey)
      const g = presets.find((b) => b.key === presetKey)?.gradient || defaultGrad
      onBgChange?.(g)
    }).catch(() => {
      setBgKey(defaultKey)
      onBgChange?.(defaultGrad)
    })
  }, [uiTheme, onBgChange])

  const pageOrder: LibPage[] = ['books', 'stats', 'settings']

  const switchPage = (target: LibPage) => {
    if (target === libPage || transition !== 'idle') return
    if (target === 'settings' || libPage === 'settings') setSettingsResetKey(k => k + 1)
    const curIdx = pageOrder.indexOf(libPage)
    const targetIdx = pageOrder.indexOf(target)
    const dir = targetIdx > curIdx ? 'down' : 'up'
    setDirection(dir)
    setTransition('out')
    clearTimeout(transRef.current)
    transRef.current = setTimeout(() => {
      setLibPage(target)
      setTransition('in')
      transRef.current = setTimeout(() => setTransition('idle'), 400)
    }, 400)
  }

  const [booksAnim, statsAnim, settingsAnim] = useMemo(() => {
    const outY = direction === 'up' ? -20 : 20
    const startY = direction === 'up' ? 20 : -20
    const outRot = direction === 'up' ? 2 : -2
    const startRot = direction === 'up' ? -2 : 2
    const anim = (page: LibPage) => {
      const active = libPage === page
      if (transition === 'idle') return { opacity: active ? 1 : 0, transform: 'translateY(0) scale(1) rotateX(0)' }
      if (transition === 'out') {
        if (active) return { opacity: 0, transform: `translateY(${outY}px) scale(0.95) rotateX(${outRot}deg)` }
        return { opacity: 0, transform: `translateY(${startY}px) scale(0.95) rotateX(${startRot}deg)` }
      }
      if (active) return { opacity: 1, transform: 'translateY(0) scale(1) rotateX(0)' }
      return { opacity: 0, transform: `translateY(${outY}px) scale(0.95) rotateX(${outRot}deg)` }
    }
    return [anim('books'), anim('stats'), anim('settings')] as const
  }, [libPage, direction, transition])

  const handlePresetChange = (key: string, gradient: string) => {
    setBgKey(key)
    onBgChange?.(gradient)
  }

  return (
    <div className="library-root">
      <div className="library-glow-1" />
      <div className="library-glow-2" />

      <SidebarNav libPage={libPage} bookCount={books.length} onSwitchPage={switchPage} onImport={onImport} />

      <div className="library-content">
        {/* books page */}
        <div className="library-page" style={{
          pointerEvents: transition !== 'idle' || libPage !== 'books' ? 'none' : 'auto',
          ...booksAnim,
        }}>
          <BookShelf books={books} readingTime={readingTime} onOpenBook={onOpenBook} onDelete={onDelete} />
        </div>

        {/* stats page */}
        <div className="library-page" style={{
          overflow: 'hidden',
          pointerEvents: transition !== 'idle' || libPage !== 'stats' ? 'none' : 'auto',
          ...statsAnim,
        }}>
          <ReadingStats books={books} />
        </div>

        {/* settings page */}
        <div className="library-page" style={{
          overflow: 'hidden',
          pointerEvents: transition !== 'idle' || libPage !== 'settings' ? 'none' : 'auto',
          ...settingsAnim,
        }}>
          <SettingsPage bgKey={bgKey} onPresetChange={handlePresetChange} resetKey={settingsResetKey} visible={libPage === 'settings'} webdavConfig={webdavConfig ?? null} onWebDAVConfigChange={onWebDAVConfigChange} aiConfig={aiConfig ?? null} onAIConfigChange={onAIConfigChange} />
        </div>
      </div>
    </div>
  )
}
