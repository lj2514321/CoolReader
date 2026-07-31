import { useCallback, useRef } from 'react'
import { ThemeMode, ReaderLayout } from '../../types'
import { saveSetting, saveReadingTime as persistReadingTimeToDB, saveBookReadingTime as persistBookReadingTime } from '../../utils/db'
import type { SharedRefs } from './useBookEngine'
import { enableSmoothScroll } from '../../utils/enableSmoothScroll'
import { applyPageAnimation } from '../../utils/animation'
import { logger } from '../../utils/logger'

export function useReaderControls(shared: SharedRefs) {
  const { bookRef, renditionRef, syncRef, navigatingRef, indexRef, cfiRef, progressRef, themeRef, layoutRef, setLayoutStateRef, totalSectionsRef, sessionStartRef, todaySecondsRef, bookTodayRef, bookSessionStartRef, bookPathRef, adapterRef } = shared
  const pageTurnSequenceRef = useRef(0)

  const setTheme = useCallback((t: ThemeMode) => {
    themeRef.current = t
    saveSetting('readerTheme', t)
    const adapter = adapterRef.current
    if (adapter) {
      try { adapter.applyTheme(t) } catch (e) { logger.error('[setTheme] adapter failed:', e) }
      return
    }
    try {
      renditionRef.current?.themes.select(t)
    } catch (e) {
      logger.error('[setTheme] failed:', e)
    }
  }, [])

  const applyLayout = useCallback((layout = layoutRef.current) => {
    const adapter = adapterRef.current
    if (adapter) {
      try { adapter.applyLayout(layout) } catch (e) { logger.warn('[applyLayout] adapter failed:', e) }
      return
    }
    // Fallback: legacy epub iframe injection
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
      html {
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        box-sizing: border-box !important;
        overflow-y: ${l.flow === 'scrolled-doc' ? 'auto' : 'hidden'} !important;
        scrollbar-width: ${l.flow === 'scrolled-doc' ? 'thin' : 'none'} !important;
        scrollbar-color: rgba(90, 82, 70, 0.36) transparent !important;
      }
      html::-webkit-scrollbar {
        width: ${l.flow === 'scrolled-doc' ? '8px' : '0'} !important;
        height: ${l.flow === 'scrolled-doc' ? '8px' : '0'} !important;
      }
      html::-webkit-scrollbar-track {
        background: transparent !important;
      }
      html::-webkit-scrollbar-thumb {
        background: rgba(90, 82, 70, 0.32) !important;
        border: 2px solid transparent !important;
        border-radius: 999px !important;
        background-clip: content-box !important;
      }
      body {
        width: 100% !important;
        min-height: 100% !important;
        font-size: ${l.fontSize}% !important;
        font-family: ${l.fontFamily} !important;
        font-weight: ${l.fontWeight} !important;
        line-height: ${l.lineHeight} !important;
        padding: 0 ${l.margin}px !important;
        max-width: ${l.flow === 'scrolled-doc' ? '72ch' : '100%'} !important;
        box-sizing: border-box !important;
        margin: ${l.flow === 'scrolled-doc' ? '0 auto' : '0'} !important;
        border: 0 !important;
        overflow-y: ${l.flow === 'scrolled-doc' ? 'auto' : 'hidden'} !important;
        scrollbar-width: ${l.flow === 'scrolled-doc' ? 'thin' : 'none'} !important;
        scrollbar-color: rgba(90, 82, 70, 0.36) transparent !important;
      }
      body::-webkit-scrollbar {
        width: ${l.flow === 'scrolled-doc' ? '8px' : '0'} !important;
        height: ${l.flow === 'scrolled-doc' ? '8px' : '0'} !important;
      }
      body::-webkit-scrollbar-track {
        background: transparent !important;
      }
      body::-webkit-scrollbar-thumb {
        background: rgba(90, 82, 70, 0.32) !important;
        border: 2px solid transparent !important;
        border-radius: 999px !important;
        background-clip: content-box !important;
      }
      body *:not(h1):not(h2):not(h3):not(h4):not(h5):not(h6):not(code):not(pre) {
        font-family: ${l.fontFamily} !important;
      }
    `
  }, [])

  const updateLayout = useCallback((patch: Partial<ReaderLayout>) => {
    const next = { ...layoutRef.current, ...patch }
    layoutRef.current = next
    setLayoutStateRef.current?.(next)
    saveSetting('readerLayout', JSON.stringify(next))
    const adapter = adapterRef.current
    if (patch.flow) {
      if (adapter) {
        try { adapter.flow(next.flow) } catch (e) { logger.warn('[updateLayout] adapter flow failed:', e) }
      } else {
        try {
          renditionRef.current?.flow(next.flow)
          if (next.flow !== 'scrolled-doc') {
            requestAnimationFrame(() => {
              const activeRendition = renditionRef.current
              if (activeRendition) enableSmoothScroll(activeRendition)
            })
          }
          requestAnimationFrame(() => {
            try { renditionRef.current?.themes.select(themeRef.current) } catch (e) { logger.warn('[updateLayout] re-select theme failed', e) }
          })
        } catch (e) {
          logger.warn('[updateLayout] flow change failed:', e)
        }
      }
    }
    applyLayout(next)
  }, [applyLayout])

  const turnPage = useCallback(async (direction: 'next' | 'prev') => {
    const turnId = ++pageTurnSequenceRef.current
    navigatingRef.current = true
    const adapter = adapterRef.current
    try {
      if (adapter) {
        await (direction === 'next' ? adapter.next() : adapter.prev())
      } else if (renditionRef.current) {
        await (direction === 'next' ? renditionRef.current.next() : renditionRef.current.prev())
      } else {
        navigatingRef.current = false
        return
      }

      // A newer turn has already moved the rendition again; only that turn should animate and unlock resize.
      if (turnId !== pageTurnSequenceRef.current) return

      const animMode = layoutRef.current.animationMode || 'slide'
      const reducedMotion = layoutRef.current.reducedMotion || false
      const activeRendition = adapter?.format === 'epub' ? renditionRef.current : adapter ? null : renditionRef.current
      applyPageAnimation(activeRendition, direction, animMode, reducedMotion, () => {
        if (turnId === pageTurnSequenceRef.current) navigatingRef.current = false
        requestAnimationFrame(syncRef.current)
      })
    } catch (e) {
      logger.warn(`[turnPage] ${direction} failed:`, e)
      if (turnId === pageTurnSequenceRef.current) navigatingRef.current = false
      requestAnimationFrame(syncRef.current)
    }
  }, [])

  const goNext = useCallback(() => turnPage('next'), [turnPage])

  const goPrev = useCallback(() => turnPage('prev'), [turnPage])

  const goToHref = useCallback(async (href: string) => {
    navigatingRef.current = true
    // Adapter path: location string may be 'chapterIdx:charOffset' or a href
    const adapter = adapterRef.current
    if (adapter) {
      try {
        await adapter.goToLocation(href)
        requestAnimationFrame(syncRef.current)
      } catch (e) {
        logger.warn('[goToHref] adapter goToLocation failed:', e)
      }
      navigatingRef.current = false
      return
    }
    // Fallback: legacy epub path
    const rendition = renditionRef.current
    const book = bookRef.current
    if (!rendition || !book) {
      navigatingRef.current = false
      return
    }
    try {
      await Promise.race([
        rendition.display(href),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        ),
      ])
      requestAnimationFrame(syncRef.current)
      navigatingRef.current = false
      requestAnimationFrame(() => renditionRef.current?.resize())
      return
    } catch {
      // swallow — epub.js error
    }
    const section = book.spine.get(href)
    if (section && section.index !== undefined) {
      try {
        await Promise.race([
          rendition.display(section.index),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 5000)
          ),
        ])
        requestAnimationFrame(syncRef.current)
        navigatingRef.current = false
        requestAnimationFrame(() => renditionRef.current?.resize())
        return
      } catch {
        // swallow — epub.js error
      }
    }
    try {
      const s = book.spine.get(href)
      if (s && rendition.manager) {
        await rendition.manager.display(s, href)
        requestAnimationFrame(syncRef.current)
      }
    } catch {
      // swallow — epub.js error
    }
    navigatingRef.current = false
    requestAnimationFrame(() => renditionRef.current?.resize())
  }, [])

  const goToCfi = useCallback(async (cfi: string) => {
    navigatingRef.current = true
    const adapter = adapterRef.current
    if (adapter) {
      try {
        await adapter.goToLocation(cfi)
        requestAnimationFrame(syncRef.current)
      } catch (e) {
        logger.warn('[goToCfi] adapter goToLocation failed:', e)
      }
      navigatingRef.current = false
      return
    }
    try {
      await renditionRef.current?.display(cfi)
      requestAnimationFrame(syncRef.current)
    } catch {
      // swallow — epub.js error
    }
    navigatingRef.current = false
    requestAnimationFrame(() => renditionRef.current?.resize())
  }, [])

  const seekTo = useCallback(async (pct: number) => {
    const adapter = adapterRef.current
    if (adapter) {
      const count = adapter.getChapterCount()
      if (count === 0) return
      const idx = Math.max(0, Math.min(count - 1, Math.floor(pct / 100 * count)))
      navigatingRef.current = true
      await adapter.goToLocation(`${idx}:0`)
      navigatingRef.current = false
      requestAnimationFrame(syncRef.current)
      return
    }
    const rendition = renditionRef.current
    const count = totalSectionsRef.current
    if (!rendition || count === 0) return
    const idx = Math.max(0, Math.min(count - 1, Math.floor(pct / 100 * count)))
    navigatingRef.current = true
    await rendition.display(idx)
    navigatingRef.current = false
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

  const saveBookReadingTime = useCallback(async () => {
    const fp = bookPathRef.current
    if (!fp) return
    const d = new Date().toISOString().slice(0, 10)
    await persistBookReadingTime(fp, d, getBookReadingSeconds())
  }, [getBookReadingSeconds])

  const getChapterText = useCallback(async (): Promise<string> => {
    const adapter = adapterRef.current
    if (adapter) {
      const idx = indexRef.current
      const text = await adapter.getChapterText(idx)
      // Strip HTML tags for plain text (AI assistant consumption)
      return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 4000)
    }
    const book = bookRef.current
    const idx = indexRef.current
    if (!book) return ''
    try {
      const spine = book.spine
      const item = spine.get(idx)
      if (!item?.href) return ''
      const html = await book.archive.getText(item.url || item.href)
      const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
      return text.slice(0, 4000)
    } catch {
      return ''
    }
  }, [])

  const getFullBookText = useCallback(async (): Promise<string> => {
    const adapter = adapterRef.current
    if (adapter) {
      const text = await adapter.getFullText()
      return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 8000)
    }
    const book = bookRef.current
    if (!book) return ''
    try {
      const spine = book.spine
      const items = (spine?.items || []) as Array<{ href?: string; url?: string }>
      let allText = ''
      for (const item of items) {
        if (!item.href) continue
        try {
          const html = await book.archive.getText(item.url || item.href)
          const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
          allText += text + '\n'
          if (allText.length > 8000) break
        } catch {
          logger.warn('[getFullBookText] failed to load:', item.href.split('/').pop() ?? item.href)
        }
      }
      return allText.slice(0, 8000)
    } catch {
      return ''
    }
  }, [])

  return {
    setTheme, applyLayout, updateLayout,
    goNext, goPrev, goToHref, goToCfi, seekTo,
    getReadingSeconds, getBookReadingSeconds, initReadingTime,
    saveReadingTime, saveBookReadingTime,
    getChapterText, getFullBookText,
  }
}
