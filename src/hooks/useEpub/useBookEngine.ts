import { useState, useCallback, useRef, useEffect } from 'react'
import ePub, { Book, Rendition } from 'epubjs'
import type SpineItem from 'epubjs/types/section'
import type View from 'epubjs/types/managers/view'
import type { NavItem as EpubNavItem } from 'epubjs/types/navigation'
import { BookMeta, NavItem, ThemeMode, themeStyles, ReaderLayout, defaultLayout, Bookmark, Highlight, CustomTheme, defaultCustomTheme, AnimationMode, BookFormat } from '../../types'
import { loadProgress, loadReadingTime, loadSetting, loadBookmarks as dbLoadBookmarks, loadHighlights as dbLoadHighlights, saveBookReadingTime as persistBookReadingTime, loadBookReadingTime as dbLoadBookReadingTime, saveSetting } from '../../utils/db'
import { enableSmoothScroll } from '../../utils/enableSmoothScroll'
import { generateCustomThemeCSS } from '../../utils/customTheme'
import { logger } from '../../utils/logger'
import { BookAdapter } from '../../adapters/BookAdapter'
import { EpubAdapter } from '../../adapters/EpubAdapter'
import { TxtAdapter } from '../../adapters/TxtAdapter'
import { MobiAdapter } from '../../adapters/MobiAdapter'
import { getFormatFromPath } from '../../utils/formatDetection'

export interface SharedRefs {
  /** @owner useBookEngine @readers [useReaderControls, useAnnotations, useSearch] @writers [useBookEngine] */
  bookRef: React.MutableRefObject<Book | null>
  /** @owner useBookEngine @readers [useReaderControls, useAnnotations, useSearch] @writers [useBookEngine] */
  renditionRef: React.MutableRefObject<Rendition | null>
  /** @owner useBookEngine @readers [useBookEngine] @writers [useBookEngine] */
  syncRef: React.MutableRefObject<() => void>
  /** @owner useBookEngine @readers [useBookEngine, useSearch] @writers [useBookEngine] */
  navigatingRef: React.MutableRefObject<boolean>
  /** @owner useBookEngine @readers [useReaderControls, useSearch, useProgressTimer] @writers [useBookEngine] */
  progressRef: React.MutableRefObject<number>
  /** @owner useBookEngine @readers [useReaderControls, useSearch, useProgressTimer] @writers [useBookEngine] */
  cfiRef: React.MutableRefObject<string>
  /** @owner useBookEngine @readers [useReaderControls, useSearch, useProgressTimer] @writers [useBookEngine] */
  indexRef: React.MutableRefObject<number>
  /** @owner useBookEngine @readers [useReaderControls] @writers [useBookEngine] */
  sectionHrefRef: React.MutableRefObject<string>
  /** @owner useReaderControls @readers [useBookEngine] @writers [useReaderControls] */
  themeRef: React.MutableRefObject<ThemeMode>
  /** @owner useReaderControls @readers [useBookEngine] @writers [useReaderControls] */
  layoutRef: React.MutableRefObject<ReaderLayout>
  /** @owner useBookEngine @readers [useReaderControls] @writers [useBookEngine] */
  setLayoutStateRef: React.MutableRefObject<((layout: ReaderLayout) => void) | null>
  /** @owner useBookEngine @readers [useBookEngine, useSearch] @writers [useBookEngine] */
  totalSectionsRef: React.MutableRefObject<number>
  /** @owner useBookEngine @readers [useBookEngine] @writers [useBookEngine] */
  sessionStartRef: React.MutableRefObject<number>
  /** @owner useBookEngine @readers [useBookEngine] @writers [useBookEngine] */
  todaySecondsRef: React.MutableRefObject<number>
  /** @owner useBookEngine @readers [useBookEngine] @writers [useBookEngine] */
  bookTodayRef: React.MutableRefObject<number>
  /** @owner useBookEngine @readers [useBookEngine] @writers [useBookEngine] */
  bookSessionStartRef: React.MutableRefObject<number>
  /** @owner useBookEngine @readers [useAnnotations] @writers [useBookEngine] */
  bookPathRef: React.MutableRefObject<string>
  /** @owner useBookEngine @readers [useReaderControls, useSearch] @writers [useBookEngine] */
  tocRef: React.MutableRefObject<NavItem[]>
  /** @owner useBookEngine @readers [useSearch] @writers [useSearch] */
  searchIndexRef: React.MutableRefObject<{ href: string; text: string }[]>
  /** @owner useBookEngine @readers [useBookEngine] @writers [useBookEngine] */
  hookRegistered: React.MutableRefObject<boolean>
  /** @owner useBookEngine @readers [useBookEngine] @writers [useBookEngine] */
  customThemeRef: React.MutableRefObject<CustomTheme>
  /** @owner useBookEngine @readers [useBookEngine] @writers [useBookEngine] @added multi-format-ebook T4
   *  Active BookAdapter for the currently open book. New consumers should prefer this over bookRef/renditionRef.
   *  For epub books: EpubAdapter wrapping epub.js. For txt: TxtAdapter. For mobi: MobiAdapter. */
  adapterRef: React.MutableRefObject<BookAdapter | null>
}

/**
 * Consumer-safe view of SharedRefs — all MutableRefObjects become readonly
 * @owner useBookEngine (all refs created here)
 * @readers [useReaderControls, useSearch, useAnnotations, useProgressTimer]
 */
export type SharedRefsConsumer = {
  readonly [K in keyof SharedRefs]: SharedRefs[K] extends React.MutableRefObject<infer T>
    ? Readonly<{ current: T }>
    : SharedRefs[K]
}

/** Navigation state refs — written by useBookEngine, read by [useReaderControls, useSearch, useProgressTimer] */
export interface NavigationRefs {
  progressRef: SharedRefs['progressRef']
  cfiRef: SharedRefs['cfiRef']
  indexRef: SharedRefs['indexRef']
  sectionHrefRef: SharedRefs['sectionHrefRef']
}

/** Book/content state refs — written by useBookEngine, read by [useReaderControls, useAnnotations] */
export interface BookStateRefs {
  bookRef: SharedRefs['bookRef']
  renditionRef: SharedRefs['renditionRef']
  tocRef: SharedRefs['tocRef']
}

/** UI state refs — written by useReaderControls, read by useBookEngine */
export interface UIStateRefs {
  themeRef: SharedRefs['themeRef']
  layoutRef: SharedRefs['layoutRef']
}

export function useBookEngine(shared: SharedRefs, opts: {
  applyLayout: () => void
  saveBookReadingTime: () => Promise<void>
  setCurrentCfi: (cfi: string) => void
  setBookmarks: React.Dispatch<React.SetStateAction<Bookmark[]>>
  setHighlights: React.Dispatch<React.SetStateAction<Highlight[]>>
  setSelectionInfo: React.Dispatch<React.SetStateAction<{ text: string; cfiRange: string; bounds: { top: number; left: number; width: number; height: number } } | null>>
}) {
  const { applyLayout, saveBookReadingTime, setCurrentCfi, setBookmarks, setHighlights, setSelectionInfo } = opts
  const { bookRef, renditionRef, syncRef, navigatingRef, progressRef, cfiRef, indexRef, sectionHrefRef, themeRef, layoutRef, setLayoutStateRef, totalSectionsRef, sessionStartRef, todaySecondsRef, bookTodayRef, bookSessionStartRef, bookPathRef, tocRef, hookRegistered, searchIndexRef, customThemeRef, adapterRef } = shared

  const [meta, setMeta] = useState<BookMeta | null>(null)
  const [toc, setToc] = useState<NavItem[]>([])
  const [theme, setThemeState] = useState<ThemeMode>('light')
  const [progress, setProgress] = useState(0)
  const [layout, setLayoutState] = useState<ReaderLayout>(defaultLayout)

  setLayoutStateRef.current = setLayoutState

  const readFile = useCallback(async (filePath: string) => {
    return window.electronAPI!.readFile(filePath)
  }, [])

  const extractMeta = useCallback(async (filePath: string): Promise<BookMeta & { coverData?: ArrayBuffer }> => {
    const data = await readFile(filePath)
    // Convert Uint8Array to ArrayBuffer if needed
    const bookData: ArrayBuffer = data instanceof ArrayBuffer
      ? data
      : (data as Uint8Array).buffer.slice(
          (data as Uint8Array).byteOffset,
          (data as Uint8Array).byteOffset + (data as Uint8Array).byteLength
        ) as ArrayBuffer
    const book = ePub(bookData)
    await book.ready
    const pkg = book.packaging
    const meta = pkg?.metadata
    const { title, creator } = {
      title: meta?.title || 'Untitled',
      creator: meta?.creator || 'Unknown'
    }
    let coverData: ArrayBuffer | undefined
    let coverMime: string | undefined
    try {
      const coverUrl = await book.coverUrl()
      if (coverUrl) {
        const resp = await fetch(coverUrl)
        const blob = await resp.blob()
        coverMime = blob.type || 'image/png'
        coverData = await blob.arrayBuffer()
      }
    } catch { logger.warn('[extractMeta] cover fetch failed') }
    book.destroy()
    return { title: title || 'Untitled', author: creator || 'Unknown', cover: undefined, coverData, coverMime }
  }, [readFile])

  const openBook = useCallback(async (filePath: string) => {
    await saveBookReadingTime()

    if (bookRef.current) {
      renditionRef.current?.destroy()
      bookRef.current.destroy()
    }
    // Also destroy any existing adapter (T4: BookAdapter abstraction)
    adapterRef.current?.destroy()
    adapterRef.current = null

    setMeta(null)
    setToc([])
    setProgress(0)
    progressRef.current = 0
    cfiRef.current = ''
    indexRef.current = 0
    sectionHrefRef.current = ''
    setCurrentCfi('')
    setSelectionInfo(null)

    // T11: dispatch by format — TXT/MOBI use the new adapter flow, EPUB continues inline
    const format: BookFormat = (() => {
      try { return getFormatFromPath(filePath) } catch { return 'epub' }
    })()
    bookPathRef.current = filePath

    if (format === 'txt' || format === 'mobi') {
      const viewer = document.getElementById('viewer')
      if (!viewer) {
        logger.error('[openBook] viewer element not found')
        return
      }
      viewer.innerHTML = ''
      const newAdapter: BookAdapter = format === 'txt'
        ? new TxtAdapter({ layout: layoutRef.current, theme: themeRef.current, customTheme: customThemeRef.current })
        : new MobiAdapter({ layout: layoutRef.current, theme: themeRef.current, customTheme: customThemeRef.current })
      try {
        await newAdapter.open(filePath, viewer)
      } catch (e) {
        const msg = String(e)
        logger.error('[openBook] txt/mobi open failed', e)
        // Surface the error message to the viewer so the user sees it
        viewer.innerHTML = `<div style="padding:40px;color:#fff;background:rgba(220,38,38,0.85);">打开文件失败: ${msg}</div>`
        return
      }
      adapterRef.current = newAdapter
      // Populate minimal state for TXT/MOBI
      const meta = (() => {
        const fname = filePath.split(/[\\/]/).pop() || ''
        const base = fname.replace(/\.(txt|mobi|azw3|prc)$/i, '')
        return { title: base, author: 'Unknown' }
      })()
      setMeta(meta)
      const toc = newAdapter.getToc()
      setToc(toc.map(t => ({ label: t.label, href: t.location })))
      tocRef.current = toc.map(t => ({ label: t.label, href: t.location }))
      // Try to load saved progress
      try {
        const saved = await loadProgress(filePath)
        if (saved) {
          await newAdapter.goToLocation(saved.location || saved.cfi)
          const loc = newAdapter.getCurrentLocation()
          progressRef.current = loc.progress
          setProgress(loc.progress)
        }
      } catch (e) {
        logger.warn('[openBook] load txt/mobi progress failed', e)
      }
      return
    }

    const data = await readFile(filePath)
    const buffer: ArrayBuffer = data instanceof ArrayBuffer ? data : (data as Uint8Array).buffer.slice((data as Uint8Array).byteOffset, (data as Uint8Array).byteOffset + (data as Uint8Array).byteLength) as ArrayBuffer
    const book = ePub(buffer)
    bookRef.current = book
    bookPathRef.current = filePath
    await book.ready

    const today = new Date().toISOString().slice(0, 10)
    todaySecondsRef.current = await loadReadingTime(today)
    sessionStartRef.current = Date.now()
    bookTodayRef.current = await dbLoadBookReadingTime(filePath, today)
    bookSessionStartRef.current = Date.now()

    const pkg = book.packaging
    const meta = pkg?.metadata
    const title = meta?.title || 'Untitled'
    const creator = meta?.creator || 'Unknown'
    let cover: string | undefined
    const coverUrl = await book.coverUrl()
    if (coverUrl) cover = coverUrl

    setMeta({
      title,
      author: creator,
      cover,
    })

    const nav = await book.loaded.navigation
    function mapToc(items: EpubNavItem[]): NavItem[] {
      return items.map((item: EpubNavItem) => ({
        label: item.label,
        href: item.href,
        subitems: item.subitems ? mapToc(item.subitems) : undefined,
      }))
    }
    const mapped = mapToc(nav.toc)
    setToc(mapped)
    tocRef.current = mapped
    searchIndexRef.current = []

    let savedLayout: string | null = null
    try {
      savedLayout = await loadSetting('readerLayout')
    } catch (e) { logger.warn('[openBook] load layout failed', e) }
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout) as ReaderLayout
        layoutRef.current = parsed
        setLayoutState(parsed)
      } catch (e) { logger.warn('[openBook] parse savedLayout failed', e) }
    }

    const rendition = book.renderTo('viewer', {
      width: '100%',
      height: '100%',
      spread: 'none',
      allowScriptedContent: true,
      flow: layoutRef.current.flow || 'paginated',
    })
    renditionRef.current = rendition

    if (layoutRef.current.flow !== 'scrolled') {
      enableSmoothScroll(rendition)
    }

    if (!hookRegistered.current) {
      hookRegistered.current = true
      rendition.hooks.content.register((view: View) => {
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
          body, body * {
            font-size: ${l.fontSize}% !important;
            font-family: ${l.fontFamily} !important;
            font-weight: ${l.fontWeight} !important;
            line-height: ${l.lineHeight} !important;
          }
          body {
            padding: 0 ${l.margin}px !important;
            max-width: 100% !important;
          }
        `

        try {
          rendition.themes.select(themeRef.current)
        } catch (e) {
          logger.warn('[content hook] theme re-select failed', e)
        }

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

    let saved: { progress: number; cfi: string; index: number } | null = null
    let savedTheme: string | null = null
    let savedCustomTheme: string | null = null
    try {
      const r = await Promise.all([loadProgress(filePath), loadSetting('readerTheme'), loadSetting('customTheme')])
      saved = r[0]
      savedTheme = r[1]
      savedCustomTheme = r[2]
    } catch (e) { logger.warn('[openBook] restore highlight failed', e) }

    if (savedTheme && savedTheme === 'custom') {
      themeRef.current = 'custom'
      setThemeState('custom')
      if (savedCustomTheme) {
        try {
          const ct = JSON.parse(savedCustomTheme) as CustomTheme
          customThemeRef.current = ct
        } catch { }
      }
    } else if (savedTheme && ['light', 'dark', 'sepia'].includes(savedTheme)) {
      themeRef.current = savedTheme as ThemeMode
      setThemeState(savedTheme as ThemeMode)
    }
    const t = themeRef.current

    ;['light', 'sepia', 'dark'].forEach(th => rendition.themes.registerCss(th, themeStyles[th]))
    if (t === 'custom') {
      rendition.themes.registerCss('custom', generateCustomThemeCSS(customThemeRef.current))
    }
    rendition.themes.select(t)

    // T4: populate BookAdapter for the new abstraction. Use the existing book/rendition/toc
    // to avoid duplicating epub.js setup. Later (Txt/Mobi) will use the open() flow directly.
    const epubAdapter = new EpubAdapter({
      layout: layoutRef.current,
      customTheme: customThemeRef.current,
      theme: t,
    })
    epubAdapter.setBook(book, rendition, mapped, filePath, layoutRef.current, t, customThemeRef.current)
    adapterRef.current = epubAdapter

    rendition.on('relocated', onRelocated)

    if (saved) {
      if (saved.cfi) {
        try {
          await rendition.display(saved.cfi)
        } catch {
          if (saved.index >= 0 && saved.index < count) {
            await rendition.display(saved.index)
          } else {
            await rendition.display()
          }
        }
      } else if (saved.index >= 0 && saved.index < count) {
        await rendition.display(saved.index)
      } else {
        await rendition.display()
      }
    } else {
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
        } catch (e) { logger.warn('[openBook] restore highlight failed', e) }
      })
    } catch (e) { logger.warn('[openBook] load bookmarks/highlights failed', e) }
  }, [readFile, saveBookReadingTime, applyLayout, setCurrentCfi, setSelectionInfo, setBookmarks, setHighlights])

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
          } catch (e) { logger.warn('[selection] getCfiFromRange failed', e) }
        }, 50)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [setSelectionInfo])

  const setTheme = useCallback((t: ThemeMode) => {
    themeRef.current = t
    setThemeState(t)
    saveSetting('readerTheme', t)
    try {
      if (t === 'custom') {
        const ct = customThemeRef.current
        renditionRef.current?.themes.registerCss('custom', generateCustomThemeCSS(ct))
        renditionRef.current?.themes.select('custom')
      } else {
        renditionRef.current?.themes.select(t)
      }
    } catch (e) {
      logger.error('[setTheme] failed:', e)
    }
  }, [])

  const setCustomTheme = useCallback((ct: CustomTheme) => {
    customThemeRef.current = ct
    saveSetting('customTheme', JSON.stringify(ct))
    try {
      renditionRef.current?.themes.registerCss('custom', generateCustomThemeCSS(ct))
      renditionRef.current?.themes.select('custom')
    } catch (e) {
      logger.error('[setCustomTheme] failed:', e)
    }
  }, [])

  const setAnimationMode = useCallback((mode: AnimationMode) => {
    layoutRef.current = { ...layoutRef.current, animationMode: mode }
    setLayoutStateRef.current?.(layoutRef.current)
    saveSetting('readerLayout', JSON.stringify(layoutRef.current))
  }, [])

  const setReducedMotion = useCallback((reduced: boolean) => {
    layoutRef.current = { ...layoutRef.current, reducedMotion: reduced }
    setLayoutStateRef.current?.(layoutRef.current)
    saveSetting('readerLayout', JSON.stringify(layoutRef.current))
  }, [])

  const resizeViewer = useCallback(() => {
    if (navigatingRef.current) return
    try {
      renditionRef.current?.resize()
    } catch (e) {
      logger.warn('[resizeViewer] failed:', e)
    }
  }, [])

  const destroy = useCallback(() => {
    // T4: also destroy the BookAdapter (calls underlying epub.js destroy for EpubAdapter)
    adapterRef.current?.destroy()
    adapterRef.current = null
    renditionRef.current?.destroy()
    bookRef.current?.destroy()
  }, [])

  return {
    meta, toc, theme, progress, layout,
    extractMeta, openBook, resizeViewer, destroy,
    setTheme, setCustomTheme, setAnimationMode, setReducedMotion,
  }
}
