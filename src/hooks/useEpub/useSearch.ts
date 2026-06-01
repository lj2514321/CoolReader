import { useCallback } from 'react'
import { NavItem, SearchResult } from '../../types'
import { logger } from '../../utils/logger'
import type { SharedRefs, NavigationRefs, BookStateRefs } from './useBookEngine'

export function useSearch(shared: SharedRefs | (NavigationRefs & BookStateRefs)) {
  const { bookRef, renditionRef, syncRef, indexRef, tocRef, searchIndexRef } = shared

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
          try { iframe.contentWindow.find(result.matchText) } catch (e) { logger.warn('[navigateToSearchResult] find failed', e) }
        }
      }, 150)
    } catch (e) { logger.warn('[navigateToSearchResult] display failed', e) }
  }, [])

  return { buildSearchIndex, searchText, navigateToSearchResult, getChapterLabel }
}
