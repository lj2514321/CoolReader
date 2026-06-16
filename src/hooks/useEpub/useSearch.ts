import { useCallback } from 'react'
import { NavItem, SearchResult } from '../../types'
import { logger } from '../../utils/logger'
import type { SharedRefs } from './useBookEngine'

export function useSearch(shared: SharedRefs) {
  const { bookRef, renditionRef, syncRef, indexRef, tocRef, searchIndexRef, adapterRef } = shared

  const getChapterLabel = useCallback((chapterIndex: number): string => {
    // Adapter path: use adapter's TOC
    const adapter = adapterRef?.current
    if (adapter) {
      const toc = adapter.getToc()
      // Try to find a matching entry by location prefix
      for (const item of toc) {
        if (item.location === `${chapterIndex}:0` || item.location === `${chapterIndex}`) return item.label
        if (item.subitems) {
          for (const sub of item.subitems) {
            if (sub.location === `${chapterIndex}:0` || sub.location === `${chapterIndex}`) return sub.label
          }
        }
      }
      return `第 ${chapterIndex + 1} 章`
    }
    // Fallback: legacy epub path
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
      } catch (e) { logger.warn('[buildSearchIndex] getText failed for', item.href.split('/').pop() ?? item.href, e); index.push({ href: item.href, text: '' }) }
    }
    searchIndexRef.current = index
  }, [])

  const searchText = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query.trim()) return []

    // Adapter path: use adapter's built-in search
    const adapter = adapterRef?.current
    if (adapter) {
      try {
        const results = await adapter.search(query)
        return results.map((r, i) => {
          // Parse location to get chapter index (format: 'chapterIdx:offset')
          const parts = r.location.split(':')
          const chapterIndex = parseInt(parts[0], 10) || 0
          return {
            chapterIndex,
            chapterHref: r.location,
            chapterLabel: r.label || getChapterLabel(chapterIndex),
            matchIndex: i,
            contextBefore: '',
            matchText: r.excerpt || query,
            contextAfter: '',
          }
        })
      } catch (e) {
        logger.warn('[searchText] adapter search failed:', e)
        return []
      }
    }

    // Fallback: legacy epub path
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
    // Adapter path
    const adapter = adapterRef?.current
    if (adapter) {
      try {
        await adapter.goToLocation(result.chapterHref)
        requestAnimationFrame(syncRef.current)
      } catch (e) {
        logger.warn('[navigateToSearchResult] adapter goToLocation failed:', e)
      }
      return
    }
    // Fallback: legacy epub path
    const rendition = renditionRef.current
    if (!rendition) return
    try {
      await rendition.display(result.chapterIndex)
      requestAnimationFrame(syncRef.current)
      setTimeout(() => {
        const iframe = document.querySelector<HTMLIFrameElement>('#viewer iframe')
        if (iframe?.contentWindow) {
          try { iframe.contentWindow.find(result.matchText) } catch (e) { logger.warn('[navigateToSearchResult] find failed', e) }
        }
      }, 150)
    } catch (e) { logger.warn('[navigateToSearchResult] display failed', e) }
  }, [])

  return { buildSearchIndex, searchText, navigateToSearchResult, getChapterLabel }
}
