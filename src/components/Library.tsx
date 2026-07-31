import { useState, useEffect } from 'react'
import { BookEntry, WebDAVConfig, AIConfig, CustomBgConfig } from '../types'
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
  onCustomBgChange?: (config: CustomBgConfig) => void
  webdavConfig?: WebDAVConfig | null
  onWebDAVConfigChange?: (config: WebDAVConfig | null) => void
  aiConfig?: AIConfig | null
  onAIConfigChange?: (config: AIConfig | null) => void
}

export function Library({ uiTheme = 'glass', books, readingTime, onOpenBook, onImport, onDelete, onBgChange, onCustomBgChange, webdavConfig, onWebDAVConfigChange, aiConfig, onAIConfigChange }: LibraryProps) {
  const [libPage, setLibPage] = useState<LibPage>('books')
  const [bgKey, setBgKey] = useState(() => uiTheme === 'flat' ? 'warmPaper' : 'inkNight')
  const [settingsResetKey, setSettingsResetKey] = useState(0)

  useEffect(() => {
    const dbKey = uiTheme === 'flat' ? 'bgPreset-flat' : 'bgPreset'
    const defaultKey = uiTheme === 'flat' ? 'warmPaper' : 'inkNight'
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

  const switchPage = (target: LibPage) => {
    if (target === libPage) return
    if (target === 'settings' || libPage === 'settings') setSettingsResetKey(k => k + 1)
    setLibPage(target)
  }

  const handlePresetChange = (key: string, gradient: string) => {
    setBgKey(key)
    onBgChange?.(gradient)
  }

  return (
    <div className="library-root">
      <SidebarNav libPage={libPage} bookCount={books.length} onSwitchPage={switchPage} onImport={onImport} />

      <div className="library-content">
        <div className="library-page" key={libPage}>
          {libPage === 'books' && (
            <BookShelf books={books} readingTime={readingTime} onOpenBook={onOpenBook} onDelete={onDelete} />
          )}
          {libPage === 'stats' && <ReadingStats books={books} />}
          {libPage === 'settings' && (
            <SettingsPage bgKey={bgKey} onPresetChange={handlePresetChange} resetKey={settingsResetKey} webdavConfig={webdavConfig ?? null} onWebDAVConfigChange={onWebDAVConfigChange} aiConfig={aiConfig ?? null} onAIConfigChange={onAIConfigChange} onCustomBgChange={onCustomBgChange} />
          )}
        </div>
      </div>
    </div>
  )
}
