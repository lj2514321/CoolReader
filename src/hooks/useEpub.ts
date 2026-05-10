import { useState, useCallback, useRef } from 'react'
import ePub, { Book, Rendition } from 'epubjs'
import { BookMeta, NavItem, ThemeMode, themeStyles } from '../types'
import { loadProgress, loadReadingTime, loadSetting, saveSetting, saveReadingTime as persistReadingTimeToDB } from '../utils/db'

export function useEpub() {
  const [meta, setMeta] = useState<BookMeta | null>(null)
  const [toc, setToc] = useState<NavItem[]>([])
  const [theme, setThemeState] = useState<ThemeMode>('light')
  const [progress, setProgress] = useState(0)
  const progressRef = useRef(0)
  const cfiRef = useRef('')
  const indexRef = useRef(0)
  const sectionHrefRef = useRef('')
  const syncRef = useRef<() => void>(() => {})
  const bookRef = useRef<Book | null>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const themeRef = useRef<ThemeMode>('light')
  const totalSectionsRef = useRef(0)
  const sessionStartRef = useRef(0)
  const todaySecondsRef = useRef(0)

  const readFile = useCallback(async (filePath: string) => {
    return window.electronAPI!.readFile(filePath)
  }, [])

  const extractMeta = useCallback(async (filePath: string): Promise<BookMeta> => {
    console.log('[extractMeta] reading file...')
    const data = await readFile(filePath)
    const book = ePub(data)
    await book.ready
    const { title, creator } = book.packaging.metadata
    let cover: string | undefined
    try {
      const coverUrl = await book.coverUrl()
      if (coverUrl) {
        const resp = await fetch(coverUrl)
        const blob = await resp.blob()
        cover = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      }
    } catch {}
    book.destroy()
    return { title: title || 'Untitled', author: creator || 'Unknown', cover }
  }, [])

  const openBook = useCallback(async (filePath: string) => {
    console.log('[openBook] called with', filePath)
    if (bookRef.current) {
      renditionRef.current?.destroy()
      bookRef.current.destroy()
    }

    setMeta(null)
    setToc([])
    setProgress(0)
    progressRef.current = 0
    cfiRef.current = ''
    indexRef.current = 0
    sectionHrefRef.current = ''

    const data = await readFile(filePath)
    const book = ePub(data)
    bookRef.current = book
    await book.ready

    const today = new Date().toISOString().slice(0, 10)
    todaySecondsRef.current = await loadReadingTime(today)
    sessionStartRef.current = Date.now()

    const { title, creator } = book.packaging.metadata
    let cover: string | undefined
    const coverUrl = await book.coverUrl()
    if (coverUrl) cover = coverUrl

    setMeta({
      title: title || 'Untitled',
      author: creator || 'Unknown',
      cover,
    })

    const nav = await book.loaded.navigation
    function mapToc(items: any[]): NavItem[] {
      return items.map((item: any) => ({
        label: item.label,
        href: item.href,
        subitems: item.subitems ? mapToc(item.subitems) : undefined,
      }))
    }
    setToc(mapToc(nav.toc))

    const rendition = book.renderTo('viewer', {
      width: '100%',
      height: '100%',
      spread: 'none',
    })
    renditionRef.current = rendition

    const count = book.spine.length || book.spine.items?.length || 0
    totalSectionsRef.current = count

    const sync = () => {
      const cur = rendition.currentLocation()
      if (!cur?.start) return
      const idx = Number(cur.start.index) || 0
      const pct = count > 0 ? Math.round((idx / count) * 100) : 0
      progressRef.current = pct
      cfiRef.current = cur.start.cfi || ''
      indexRef.current = idx
      const spineItems = book.spine?.items
      sectionHrefRef.current = spineItems?.[idx]?.href || ''
      setProgress(pct)
    }

    const onRelocated = () => requestAnimationFrame(sync)
    syncRef.current = sync

    // load saved data BEFORE display
    let saved: { progress: number; cfi: string; index: number } | null = null
    let savedTheme: string | null = null
    try {
      const r = await Promise.all([loadProgress(filePath), loadSetting('readerTheme')])
      saved = r[0]
      savedTheme = r[1]
    } catch (e) { console.warn('[openBook] load saved failed', e) }

    // apply theme
    if (savedTheme && ['light', 'dark', 'sepia'].includes(savedTheme)) {
      themeRef.current = savedTheme as ThemeMode
      setThemeState(savedTheme as ThemeMode)
    }
    const t = themeRef.current

    // register themes via proper API (registerUrl is called for string — use registerCss instead)
    ;['light', 'sepia', 'dark'].forEach(th => rendition.themes.registerCss(th, themeStyles[th]))
    rendition.themes.select(t)

    // register handlers BEFORE display so relocated is caught
    rendition.on('relocated', onRelocated)
    rendition.on('linkClicked', (href: string) => {
      console.log('[linkClicked]', href)
    })

    // display saved position directly (skip section 0 flash)
    if (saved) {
      console.log('[openBook] saved data:', saved)
      if (saved.cfi) {
        console.log('[openBook] restoring via CFI:', saved.cfi)
        try {
          await rendition.display(saved.cfi)
        } catch {
          console.warn('[openBook] CFI restore failed, fallback to index:', saved.index)
          if (saved.index >= 0 && saved.index < count) {
            await rendition.display(saved.index)
          } else {
            await rendition.display()
          }
        }
      } else if (saved.index >= 0 && saved.index < count) {
        console.log('[openBook] restoring via index:', saved.index)
        await rendition.display(saved.index)
      } else {
        console.log('[openBook] invalid saved data, display default')
        await rendition.display()
      }
    } else {
      console.log('[openBook] no saved data, display default')
      await rendition.display()
    }

    requestAnimationFrame(sync)
  }, [])

  const seekTo = useCallback((pct: number) => {
    const rendition = renditionRef.current
    const count = totalSectionsRef.current
    if (!rendition || count === 0) return
    const idx = Math.max(0, Math.min(count - 1, Math.floor(pct / 100 * count)))
    rendition.display(idx)
  }, [])

  const setTheme = useCallback((t: ThemeMode) => {
    themeRef.current = t
    setThemeState(t)
    saveSetting('readerTheme', t)
    try {
      renditionRef.current?.themes.select(t)
    } catch (e) {
      console.error('[setTheme] failed:', e)
    }
  }, [])

  const goNext = useCallback(async () => {
    await renditionRef.current?.next()
    requestAnimationFrame(syncRef.current)
  }, [])
  const goPrev = useCallback(async () => {
    await renditionRef.current?.prev()
    requestAnimationFrame(syncRef.current)
  }, [])
  const goToHref = useCallback((href: string) => renditionRef.current?.display(href), [])

  const getReadingSeconds = useCallback(() => {
    if (sessionStartRef.current === 0) return todaySecondsRef.current
    return todaySecondsRef.current + Math.floor((Date.now() - sessionStartRef.current) / 1000)
  }, [])

  const initReadingTime = useCallback((seconds: number) => {
    todaySecondsRef.current = seconds
  }, [])

  const saveReadingTime = useCallback(async () => {
    const d = new Date().toISOString().slice(0, 10)
    await persistReadingTimeToDB(d, getReadingSeconds())
  }, [getReadingSeconds])

  const resizeViewer = useCallback(() => {
    try {
      renditionRef.current?.resize()
    } catch (e) {
      console.warn('[resizeViewer] failed:', e)
    }
  }, [])

  const destroy = useCallback(() => {
    saveReadingTime()
    renditionRef.current?.destroy()
    bookRef.current?.destroy()
  }, [saveReadingTime])

  return { meta, toc, theme, progress, progressRef, cfiRef, indexRef, sectionHrefRef, extractMeta, openBook, initReadingTime, setTheme, goNext, goPrev, goToHref, seekTo, getReadingSeconds, saveReadingTime, resizeViewer, destroy }
}
