import { useCallback } from 'react'
import { ThemeMode, ReaderLayout } from '../../types'
import { saveSetting, saveReadingTime as persistReadingTimeToDB, saveBookReadingTime as persistBookReadingTime } from '../../utils/db'
import type { SharedRefs } from './useBookEngine'
import { enableSmoothScroll } from '../../utils/enableSmoothScroll'
import { applyPageAnimation } from '../../utils/animation'
import { logger } from '../../utils/logger'

export function useReaderControls(shared: SharedRefs) {
  const { bookRef, renditionRef, syncRef, navigatingRef, indexRef, cfiRef, progressRef, themeRef, layoutRef, setLayoutStateRef, totalSectionsRef, sessionStartRef, todaySecondsRef, bookTodayRef, bookSessionStartRef, bookPathRef, adapterRef } = shared

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

  const applyLayout = useCallback(() => {
    const adapter = adapterRef.current
    if (adapter) {
      try { adapter.applyLayout() } catch (e) { logger.warn('[applyLayout] adapter failed:', e) }
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
      body {
        font-size: ${l.fontSize}% !important;
        font-family: ${l.fontFamily} !important;
        font-weight: ${l.fontWeight} !important;
        line-height: ${l.lineHeight} !important;
        padding: 0 ${l.margin}px !important;
        max-width: 100% !important;
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
          // @ts-expect-error 'scrolled' flow mode is supported at runtime but not in ReaderLayout flow type
          if (next.flow !== 'scrolled') {
            requestAnimationFrame(() => enableSmoothScroll(renditionRef.current))
          }
          requestAnimationFrame(() => {
            try { renditionRef.current?.themes.select(themeRef.current) } catch (e) { logger.warn('[updateLayout] re-select theme failed', e) }
          })
        } catch (e) {
          logger.warn('[updateLayout] flow change failed:', e)
        }
      }
    }
    applyLayout()
  }, [applyLayout])

  const goNext = useCallback(async () => {
    navigatingRef.current = true
    const adapter = adapterRef.current
    // Non-epub adapters (txt/mobi): no animation, just navigate
    if (adapter && adapter.format !== 'epub') {
      await adapter.next()
      navigatingRef.current = false
      requestAnimationFrame(syncRef.current)
      return
    }
    // EPUB path (adapter or legacy): navigate + animation
    if (adapter) await adapter.next()
    else await renditionRef.current?.next()
    const animMode = layoutRef.current.animationMode || 'slide'
    const reducedMotion = layoutRef.current.reducedMotion || false
    // @ts-expect-error '3d' is supported at runtime but missing from AnimationMode type
    if (animMode === '3d') {
      navigatingRef.current = false
      requestAnimationFrame(syncRef.current)
      return
    }
    applyPageAnimation(renditionRef.current, 'next', animMode, reducedMotion, () => {
      navigatingRef.current = false
      requestAnimationFrame(syncRef.current)
    })
  }, [])

  const goPrev = useCallback(async () => {
    navigatingRef.current = true
    const adapter = adapterRef.current
    // Non-epub adapters (txt/mobi): no animation, just navigate
    if (adapter && adapter.format !== 'epub') {
      await adapter.prev()
      navigatingRef.current = false
      requestAnimationFrame(syncRef.current)
      return
    }
    // EPUB path (adapter or legacy): navigate + animation
    if (adapter) await adapter.prev()
    else await renditionRef.current?.prev()
    const animMode = layoutRef.current.animationMode || 'slide'
    const reducedMotion = layoutRef.current.reducedMotion || false
    // @ts-expect-error '3d' is supported at runtime but missing from AnimationMode type
    if (animMode === '3d') {
      navigatingRef.current = false
      requestAnimationFrame(syncRef.current)
      return
    }
    applyPageAnimation(renditionRef.current, 'prev', animMode, reducedMotion, () => {
      navigatingRef.current = false
      requestAnimationFrame(syncRef.current)
    })
  }, [])

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
    if (section) {
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
      const html = await book.archive.getText(item.url)
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
