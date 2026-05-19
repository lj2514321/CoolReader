import { useState, useCallback, useRef, useEffect } from 'react'
import ePub, { Book, Rendition } from 'epubjs'
import { BookMeta, NavItem, ThemeMode, themeStyles, ReaderLayout, defaultLayout, Bookmark, Highlight, SearchResult } from '../types'
import { loadProgress, loadReadingTime, loadSetting, saveSetting, saveReadingTime as persistReadingTimeToDB, addBookmark as dbAddBookmark, removeBookmark as dbRemoveBookmark, loadBookmarks as dbLoadBookmarks, isBookmarked as dbIsBookmarked, addHighlight as dbAddHighlight, removeHighlight as dbRemoveHighlight, loadHighlights as dbLoadHighlights, saveBookReadingTime as persistBookReadingTime, loadBookReadingTime as dbLoadBookReadingTime } from '../utils/db'

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
  const bookTodayRef = useRef(0)
  const bookSessionStartRef = useRef(0)
  const [layout, setLayoutState] = useState<ReaderLayout>(defaultLayout)
  const layoutRef = useRef(layout)
  const hookRegistered = useRef(false)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [selectionInfo, setSelectionInfo] = useState<{ text: string; cfiRange: string; bounds: { top: number; left: number; width: number; height: number } } | null>(null)
  const bookPathRef = useRef('')
  const tocRef = useRef<NavItem[]>([])
  const searchIndexRef = useRef<{ href: string; text: string }[]>([])
  const [currentCfi, setCurrentCfi] = useState('')

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
    } catch { console.warn('[extractMeta] cover fetch failed') }
    book.destroy()
    return { title: title || 'Untitled', author: creator || 'Unknown', cover }
  }, [])

  const openBook = useCallback(async (filePath: string) => {
    console.log('[openBook] called with', filePath)
    // save previous book's reading time before switching
    await saveBookReadingTimeCallback()

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
    setSelectionInfo(null)
    setCurrentCfi('')

    const data = await readFile(filePath)
    const book = ePub(data)
    bookRef.current = book
    bookPathRef.current = filePath
    await book.ready

    const today = new Date().toISOString().slice(0, 10)
    todaySecondsRef.current = await loadReadingTime(today)
    sessionStartRef.current = Date.now()
    bookTodayRef.current = await dbLoadBookReadingTime(filePath, today)
    bookSessionStartRef.current = Date.now()

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
    const mapped = mapToc(nav.toc)
    setToc(mapped)
    tocRef.current = mapped
    searchIndexRef.current = [] // invalidate search index on new book open

    // load saved layout BEFORE renderTo so flow mode is applied from the start
    let savedLayout: string | null = null
    try {
      savedLayout = await loadSetting('readerLayout')
    } catch (e) { console.warn('[openBook] load layout failed', e) }
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout) as ReaderLayout
        layoutRef.current = parsed
        setLayoutState(parsed)
      } catch (e) { console.warn('[openBook] parse savedLayout failed', e) }
    }

    const rendition = book.renderTo('viewer', {
      width: '100%',
      height: '100%',
      spread: 'none',
      allowScriptedContent: true,
      flow: layoutRef.current.flow || 'paginated',
    })
    renditionRef.current = rendition

    if (!hookRegistered.current) {
      hookRegistered.current = true
      rendition.hooks.content.register((view: any) => {
        const doc = view.document
        if (!doc || typeof doc.getElementById !== 'function') return
        const l = layoutRef.current
        let style = doc.getElementById('_reader_layout') as HTMLStyleElement
        if (!style) {
          style = doc.createElement('style')
          style.id = '_reader_layout'
          doc.head.appendChild(style)
        }
        style.textContent = `
          body {
            font-size: ${l.fontSize}% !important;
            font-family: ${l.fontFamily} !important;
            line-height: ${l.lineHeight} !important;
            padding: 0 ${l.margin}px !important;
            max-width: 100% !important;
          }
        `

        const selScript = doc.createElement('script')
        selScript.id = '_reader_sel'
        selScript.textContent = `
document.addEventListener('mouseup',function(){var s=window.getSelection();if(s&&!s.isCollapsed){var t=s.toString().trim();if(t.length>0){var r=s.getRangeAt(0).getBoundingClientRect();window.parent.postMessage({type:'reader-text-selected',text:t.slice(0,200),bounds:{top:r.top,left:r.left,width:r.width,height:r.height}},'*')}}})
`
        if (!doc.getElementById('_reader_sel')) {
          doc.head.appendChild(selScript)
        }
      })
    }

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
      setCurrentCfi(cur.start.cfi || '')
    }

    const onRelocated = () => {
      requestAnimationFrame(sync)
      requestAnimationFrame(applyLayout)
    }
    syncRef.current = sync

    // load saved progress & theme BEFORE display
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

    try {
      const bms = await dbLoadBookmarks(filePath)
      setBookmarks(bms)
      const hls = await dbLoadHighlights(filePath)
      setHighlights(hls)
      hls.forEach(hl => {
        try {
          if (rendition && typeof rendition.annotations?.highlight === 'function') {
            rendition.annotations.highlight(hl.cfiRange, {}, () => {}, 'epub-highlight', { fill: hl.color, 'fill-opacity': '0.3' })
          }
        } catch (e) { console.warn('[openBook] restore highlight failed', e) }
      })
    } catch (e) { console.warn('[openBook] load bookmarks/highlights failed', e) }
  }, [])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'reader-text-selected') {
        setTimeout(() => {
          const iframe = document.querySelector<HTMLIFrameElement>('#viewer iframe')
          const sel = iframe?.contentDocument?.getSelection()
          if (!sel || sel.isCollapsed) return
          const range = sel.getRangeAt(0)
          const rend = renditionRef.current
          if (!rend || typeof rend.getCfiFromRange !== 'function') return
          try {
            const cfiRange = rend.getCfiFromRange(range)
            setSelectionInfo({ text: e.data.text, cfiRange, bounds: e.data.bounds })
          } catch (e) { console.warn('[selection] getCfiFromRange failed', e) }
        }, 50)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const clearSelection = useCallback(() => setSelectionInfo(null), [])

  const seekTo = useCallback((pct: number) => {
    const rendition = renditionRef.current
    const count = totalSectionsRef.current
    if (!rendition || count === 0) return
    const idx = Math.max(0, Math.min(count - 1, Math.floor(pct / 100 * count)))
    rendition.display(idx)
  }, [])

  const applyLayout = useCallback(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('#viewer iframe')
    if (!iframe?.contentDocument?.head) return
    const l = layoutRef.current
    let style = iframe.contentDocument.getElementById('_reader_layout') as HTMLStyleElement
    if (!style) {
      style = iframe.contentDocument.createElement('style')
      style.id = '_reader_layout'
      iframe.contentDocument.head.appendChild(style)
    }
    style.textContent = `
      body {
        font-size: ${l.fontSize}% !important;
        font-family: ${l.fontFamily} !important;
        line-height: ${l.lineHeight} !important;
        padding: 0 ${l.margin}px !important;
        max-width: 100% !important;
      }
    `
  }, [])

  const updateLayout = useCallback((patch: Partial<ReaderLayout>) => {
    const next = { ...layoutRef.current, ...patch }
    layoutRef.current = next
    setLayoutState(next)
    saveSetting('readerLayout', JSON.stringify(next))
    if (patch.flow) {
      try {
        renditionRef.current?.flow(next.flow)
        requestAnimationFrame(() => {
          try { renditionRef.current?.themes.select(themeRef.current) } catch (e) { console.warn('[updateLayout] re-select theme failed', e) }
        })
      } catch (e) {
        console.warn('[updateLayout] flow change failed:', e)
      }
    }
    applyLayout()
  }, [applyLayout])

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
  const goToHref = useCallback(async (href: string) => {
    console.log('[goToHref] called with:', href, 'rendition:', !!renditionRef.current, 'book:', !!bookRef.current)
    const rendition = renditionRef.current
    const book = bookRef.current
    if (!rendition || !book) {
      console.warn('[goToHref] abort: rendition or book null')
      return
    }
    try {
      await Promise.race([
        rendition.display(href),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        ),
      ])
      console.log('[goToHref] display resolved for:', href)
      const viewer = document.getElementById('viewer')
      const stage = viewer?.firstElementChild as HTMLElement
      const iframe = stage?.querySelector('iframe')
      const iframeDoc = iframe?.contentDocument
      console.log('[goToHref] scrollLeft:', stage?.scrollLeft)
      console.log('[goToHref] scrollTop:', stage?.scrollTop)
      console.log('[goToHref] containerW:', stage?.clientWidth)
      console.log('[goToHref] containerH:', stage?.clientHeight)
      console.log('[goToHref] iframeW:', iframe?.clientWidth)
      console.log('[goToHref] iframeH:', iframe?.clientHeight)
      console.log('[goToHref] chapterTitle:', iframeDoc?.querySelector('h1, h2, .chapter-title, #title')?.textContent?.slice(0, 50))
      console.log('[goToHref] bodyText:', iframeDoc?.body?.textContent?.slice(0, 100)?.replace(/\s+/g, ' '))
      const loc = rendition.currentLocation()
      console.log('[goToHref] currentLocation:', JSON.stringify(loc))
      requestAnimationFrame(syncRef.current)
      return
    } catch (err) {
      console.log('[goToHref] direct display failed:', href, err)
    }
    const section = book.spine.get(href)
    if (section) {
      console.log('[goToHref] fallback: using index', section.index, 'for', href)
      try {
        await Promise.race([
          rendition.display(section.index),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 5000)
          ),
        ])
        requestAnimationFrame(syncRef.current)
        return
      } catch (err2) {
        console.log('[goToHref] fallback also failed:', href, err2)
      }
    } else {
      console.warn('[goToHref] fallback: section not found for', href,
        'spine items:', book.spine.items?.map((i: any) => i.href))
    }
    try {
      const s = book.spine.get(href)
      if (s && (rendition as any).manager) {
        console.log('[goToHref] last resort: manager.display')
        await (rendition as any).manager.display(s, href)
        requestAnimationFrame(syncRef.current)
      }
    } catch (e) {
      console.error('[goToHref] all navigation attempts failed', e)
    }
  }, [])
  const goToCfi = useCallback(async (cfi: string) => {
    try {
      await renditionRef.current?.display(cfi)
      requestAnimationFrame(syncRef.current)
    } catch (e) { console.warn('[goToCfi] display failed', e) }
  }, [])

  const getReadingSeconds = useCallback(() => {
    if (sessionStartRef.current === 0) return todaySecondsRef.current
    return todaySecondsRef.current + Math.floor((Date.now() - sessionStartRef.current) / 1000)
  }, [])

  const getBookReadingSeconds = useCallback(() => {
    if (bookSessionStartRef.current === 0) return bookTodayRef.current
    return bookTodayRef.current + Math.floor((Date.now() - bookSessionStartRef.current) / 1000)
  }, [])

  const initReadingTime = useCallback((seconds: number) => {
    todaySecondsRef.current = seconds
  }, [])

  const saveReadingTime = useCallback(async () => {
    const d = new Date().toISOString().slice(0, 10)
    await persistReadingTimeToDB(d, getReadingSeconds())
  }, [getReadingSeconds])

  const saveBookReadingTimeCallback = useCallback(async () => {
    const fp = bookPathRef.current
    if (!fp) return
    const d = new Date().toISOString().slice(0, 10)
    await persistBookReadingTime(fp, d, getBookReadingSeconds())
  }, [getBookReadingSeconds])

  const resizeViewer = useCallback(() => {
    try {
      renditionRef.current?.resize()
    } catch (e) {
      console.warn('[resizeViewer] failed:', e)
    }
  }, [])

  const getChapterText = useCallback(async (): Promise<string> => {
    const book = bookRef.current
    const idx = indexRef.current
    if (!book) return ''
    try {
      const spine = book.spine
      const item = spine.get(idx)
      if (!item?.href) return ''
      const html = await book.archive.getText(item.url)
      const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
      return text.slice(0, 4000)
    } catch {
      return ''
    }
  }, [])

  const getFullBookText = useCallback(async (): Promise<string> => {
    const book = bookRef.current
    if (!book) return ''
    try {
      const spine = book.spine
      const items = spine?.items || []
      let allText = ''
      for (const item of items) {
        if (!item.href) continue
        try {
          const html = await book.archive.getText(item.url)
          const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
          allText += text + '\n'
          if (allText.length > 8000) break
        } catch {
          console.warn('[getFullBookText] failed to load:', item.href)
        }
      }
      return allText.slice(0, 8000)
    } catch {
      return ''
    }
  }, [])

  const toggleBookmark = useCallback(async () => {
    const fp = bookPathRef.current
    const c = currentCfi
    if (!fp || !c) return
    const existing = await dbIsBookmarked(fp, c)
    if (existing !== null) {
      await dbRemoveBookmark(existing)
      setBookmarks(prev => prev.filter(b => b.id !== existing))
    } else {
      const toc = bookRef.current?.packaging?.metadata?.title || ''
      const id = await dbAddBookmark({ filePath: fp, cfi: c, label: toc || 'Bookmark', createdAt: Date.now() })
      setBookmarks(prev => [...prev, { id, filePath: fp, cfi: c, label: toc || 'Bookmark', createdAt: Date.now() }])
    }
  }, [currentCfi])

  const removeBookmarkById = useCallback(async (id: number) => {
    const bm = bookmarks.find(b => b.id === id)
    await dbRemoveBookmark(id)
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }, [bookmarks])

  const addHighlight = useCallback(async (color: string, note?: string) => {
    const info = selectionInfo
    if (!info) return
    const fp = bookPathRef.current
    if (!fp) return
    const id = await dbAddHighlight({ filePath: fp, cfiRange: info.cfiRange, text: info.text, note, color, createdAt: Date.now() })
    setHighlights(prev => [...prev, { id, filePath: fp, cfiRange: info.cfiRange, text: info.text, note, color, createdAt: Date.now() }])
    try {
      renditionRef.current?.annotations?.highlight(info.cfiRange, {}, () => {}, 'epub-highlight', { fill: color, 'fill-opacity': '0.3' })
    } catch (e) { console.warn('[addHighlight] annotation highlight failed', e) }
    setSelectionInfo(null)
  }, [selectionInfo])

  const removeHighlight = useCallback(async (id: number, cfiRange: string) => {
    await dbRemoveHighlight(id)
    setHighlights(prev => prev.filter(h => h.id !== id))
    try {
      renditionRef.current?.annotations?.remove(cfiRange, 'highlight')
    } catch (e) { console.warn('[removeHighlight] annotation remove failed', e) }
  }, [])

  const buildSearchIndex = useCallback(async () => {
    const book = bookRef.current
    if (!book) return
    const spine = book.spine
    const items = spine?.items || []
    const index: { href: string; text: string }[] = []
    for (const item of items) {
      if (!item.href) continue
      try {
        const html = await book.archive.getText(item.url)
        const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
        index.push({ href: item.href, text })
      } catch (e) { console.warn('[buildSearchIndex] getText failed for', item.href, e); index.push({ href: item.href, text: '' }) }
    }
    searchIndexRef.current = index
  }, [])

  const getChapterLabel = useCallback((chapterIndex: number): string => {
    const items = tocRef.current
    const spine = bookRef.current?.spine?.items
    const href = spine?.[chapterIndex]?.href
    if (!href) return `第 ${chapterIndex + 1} 章`
    const find = (list: NavItem[]): string | null => {
      for (const item of list) {
        if (item.href === href || item.href.endsWith(href)) return item.label
        if (item.subitems) {
          const r = find(item.subitems)
          if (r) return r
        }
      }
      return null
    }
    return find(items) || `第 ${chapterIndex + 1} 章`
  }, [])

  const searchText = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query.trim()) return []
    if (searchIndexRef.current.length === 0) await buildSearchIndex()
    const lq = query.toLowerCase()
    const results: SearchResult[] = []
    for (let i = 0; i < searchIndexRef.current.length; i++) {
      const { href, text } = searchIndexRef.current[i]
      const lower = text.toLowerCase()
      let pos = 0
      let mi = 0
      while (pos < lower.length) {
        const idx = lower.indexOf(lq, pos)
        if (idx === -1) break
        results.push({
          chapterIndex: i,
          chapterHref: href,
          chapterLabel: getChapterLabel(i),
          matchIndex: mi++,
          contextBefore: text.slice(Math.max(0, idx - 40), idx),
          matchText: text.slice(idx, idx + query.length),
          contextAfter: text.slice(idx + query.length, idx + query.length + 40),
        })
        pos = idx + 1
      }
    }
    return results
  }, [buildSearchIndex, getChapterLabel])

  const navigateToSearchResult = useCallback(async (result: SearchResult) => {
    const rendition = renditionRef.current
    if (!rendition) return
    try {
      await rendition.display(result.chapterIndex)
      requestAnimationFrame(syncRef.current)
      setTimeout(() => {
        const iframe = document.querySelector<HTMLIFrameElement>('#viewer iframe')
        if (iframe?.contentWindow) {
          try { iframe.contentWindow.find(result.matchText) } catch (e) { console.warn('[navigateToSearchResult] find failed', e) }
        }
      }, 150)
    } catch (e) { console.warn('[navigateToSearchResult] display failed', e) }
  }, [])

  const destroy = useCallback(() => {
    saveBookReadingTimeCallback()
    saveReadingTime()
    renditionRef.current?.destroy()
    bookRef.current?.destroy()
  }, [saveReadingTime, saveBookReadingTimeCallback])

  return { meta, toc, theme, progress, progressRef, cfiRef, indexRef, sectionHrefRef, extractMeta, openBook, initReadingTime, setTheme, goNext, goPrev, goToHref, goToCfi, seekTo, getReadingSeconds, saveReadingTime, resizeViewer, destroy, getChapterText, getFullBookText, layout, updateLayout, bookmarks, highlights, selectionInfo, currentCfi, toggleBookmark, removeBookmarkById, addHighlight, removeHighlight, clearSelection, searchText, navigateToSearchResult, getChapterLabel, getBookReadingSeconds, saveBookReadingTime: saveBookReadingTimeCallback }
}
