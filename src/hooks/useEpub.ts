import { useState, useCallback, useRef } from 'react'
import ePub, { Book, Rendition } from 'epubjs'
import { BookMeta, NavItem, ThemeMode, themeStyles } from '../types'
import { loadProgress } from '../utils/db'

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
    if (bookRef.current) {
      renditionRef.current?.destroy()
      bookRef.current.destroy()
    }

    const data = await readFile(filePath)
    const book = ePub(data)
    bookRef.current = book
    await book.ready

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
    await rendition.display()

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
    rendition.on('relocated', onRelocated)
    requestAnimationFrame(sync)

    const t = themeRef.current
    rendition.themes.register(t, themeStyles[t])
    rendition.themes.select(t)

    // restore saved position by section index
    loadProgress(filePath).then((saved) => {
      if (!saved) return
      const idx = saved.index
      if (idx > 0 && idx < count) rendition.display(idx)
    }).catch(() => {})
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
    const rendition = renditionRef.current
    if (rendition) {
      rendition.themes.register(t, themeStyles[t])
      rendition.themes.select(t)
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

  const destroy = useCallback(() => {
    renditionRef.current?.destroy()
    bookRef.current?.destroy()
  }, [])

  return { meta, toc, theme, progress, progressRef, cfiRef, indexRef, sectionHrefRef, extractMeta, openBook, setTheme, goNext, goPrev, goToHref, seekTo, destroy }
}
