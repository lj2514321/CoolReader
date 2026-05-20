import { useCallback } from 'react'
import { ThemeMode, ReaderLayout } from '../../types'
import { saveSetting, saveReadingTime as persistReadingTimeToDB, saveBookReadingTime as persistBookReadingTime } from '../../utils/db'
import type { SharedRefs } from './useBookEngine'
import { enableSmoothScroll } from '../../utils/enableSmoothScroll'

export function useReaderControls(shared: SharedRefs) {
  const { bookRef, renditionRef, syncRef, navigatingRef, indexRef, cfiRef, progressRef, themeRef, layoutRef, totalSectionsRef, sessionStartRef, todaySecondsRef, bookTodayRef, bookSessionStartRef, bookPathRef } = shared

  const setTheme = useCallback((t: ThemeMode) => {
    themeRef.current = t
    // We need to call setThemeState from the caller — handled via return value
    saveSetting('readerTheme', t)
    try {
      renditionRef.current?.themes.select(t)
    } catch (e) {
      console.error('[setTheme] failed:', e)
    }
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
    saveSetting('readerLayout', JSON.stringify(next))
    if (patch.flow) {
      try {
        renditionRef.current?.flow(next.flow)
        if (next.flow !== 'scrolled') {
          requestAnimationFrame(() => enableSmoothScroll(renditionRef.current))
        }
        requestAnimationFrame(() => {
          try { renditionRef.current?.themes.select(themeRef.current) } catch (e) { console.warn('[updateLayout] re-select theme failed', e) }
        })
      } catch (e) {
        console.warn('[updateLayout] flow change failed:', e)
      }
    }
    applyLayout()
  }, [applyLayout])

  const goNext = useCallback(async () => {
    navigatingRef.current = true
    await renditionRef.current?.next()
    navigatingRef.current = false
    requestAnimationFrame(syncRef.current)
  }, [])

  const goPrev = useCallback(async () => {
    navigatingRef.current = true
    await renditionRef.current?.prev()
    navigatingRef.current = false
    requestAnimationFrame(syncRef.current)
  }, [])

  const goToHref = useCallback(async (href: string) => {
    navigatingRef.current = true
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
    } catch { }
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
      } catch { }
    }
    try {
      const s = book.spine.get(href)
      if (s && (rendition as any).manager) {
        await (rendition as any).manager.display(s, href)
        requestAnimationFrame(syncRef.current)
      }
    } catch { }
    navigatingRef.current = false
    requestAnimationFrame(() => renditionRef.current?.resize())
  }, [])

  const goToCfi = useCallback(async (cfi: string) => {
    navigatingRef.current = true
    try {
      await renditionRef.current?.display(cfi)
      requestAnimationFrame(syncRef.current)
    } catch { }
    navigatingRef.current = false
    requestAnimationFrame(() => renditionRef.current?.resize())
  }, [])

  const seekTo = useCallback(async (pct: number) => {
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

  return {
    setTheme, applyLayout, updateLayout,
    goNext, goPrev, goToHref, goToCfi, seekTo,
    getReadingSeconds, getBookReadingSeconds, initReadingTime,
    saveReadingTime, saveBookReadingTime,
    getChapterText, getFullBookText,
  }
}
