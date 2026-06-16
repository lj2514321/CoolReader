import { useState, useCallback } from 'react'
import { Bookmark, Highlight } from '../../types'
import { addBookmark as dbAddBookmark, removeBookmark as dbRemoveBookmark, isBookmarked as dbIsBookmarked, addHighlight as dbAddHighlight, removeHighlight as dbRemoveHighlight, loadBookmarks as dbLoadBookmarks, loadHighlights as dbLoadHighlights } from '../../utils/db'
import type { SharedRefs } from './useBookEngine'
import { logger } from '../../utils/logger'

export function useAnnotations(shared: SharedRefs) {
  const { bookRef, renditionRef, bookPathRef, adapterRef } = shared

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [selectionInfo, setSelectionInfo] = useState<{ text: string; cfiRange: string; bounds: { top: number; left: number; width: number; height: number } } | null>(null)
  const [currentCfi, setCurrentCfi] = useState('')

  const toggleBookmark = useCallback(async () => {
    const fp = bookPathRef.current
    // For adapter-based formats, get location from adapter
    const adapter = adapterRef?.current
    let c = currentCfi
    if (!c && adapter) {
      const loc = adapter.getCurrentLocation()
      c = loc.location
    }
    if (!fp || !c) return
    const existing = await dbIsBookmarked(fp, c)
    if (existing !== null) {
      await dbRemoveBookmark(existing)
      setBookmarks(prev => prev.filter(b => b.id !== existing))
    } else {
      const toc = adapter
        ? (adapter.getCurrentLocation().chapterLabel || '')
        : (bookRef.current?.packaging?.metadata?.title || '')
      const id = await dbAddBookmark({ filePath: fp, cfi: c, location: c, label: toc || 'Bookmark', createdAt: Date.now() })
      setBookmarks(prev => [...prev, { id, filePath: fp, cfi: c, location: c, label: toc || 'Bookmark', createdAt: Date.now() }])
    }
  }, [currentCfi])

  const removeBookmarkById = useCallback(async (id: number) => {
    await dbRemoveBookmark(id)
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }, [])

  const addHighlight = useCallback(async (color: string, note?: string) => {
    const info = selectionInfo
    if (!info) return
    const fp = bookPathRef.current
    if (!fp) return

    // Try adapter path first (for txt/mobi and future formats)
    const adapter = adapterRef?.current
    if (adapter) {
      try {
        await adapter.addHighlight({
          location: info.cfiRange,
          text: info.text,
          color,
        })
      } catch (e) { logger.warn('[addHighlight] adapter failed', e) }
      // Always persist to DB so highlights survive even if adapter can't render them now
      const id = await dbAddHighlight({ filePath: fp, cfiRange: info.cfiRange, location: info.cfiRange, text: info.text, note, color, createdAt: Date.now() })
      setHighlights(prev => [...prev, { id, filePath: fp, cfiRange: info.cfiRange, location: info.cfiRange, text: info.text, note, color, createdAt: Date.now() }])
      setSelectionInfo(null)
      return
    }

    // Fallback: legacy epub path
    const id = await dbAddHighlight({ filePath: fp, cfiRange: info.cfiRange, location: info.cfiRange, text: info.text, note, color, createdAt: Date.now() })
    setHighlights(prev => [...prev, { id, filePath: fp, cfiRange: info.cfiRange, location: info.cfiRange, text: info.text, note, color, createdAt: Date.now() }])
    try {
      renditionRef.current?.annotations?.highlight(info.cfiRange, {}, () => {}, 'epub-highlight', { fill: color, 'fill-opacity': '0.3' })
    } catch (e) { logger.warn('[addHighlight] annotation highlight failed', e) }
    setSelectionInfo(null)
  }, [selectionInfo])

  const removeHighlight = useCallback(async (id: number, cfiRange: string) => {
    await dbRemoveHighlight(id)
    const remaining = highlights.filter(h => h.id !== id)
    setHighlights(prev => prev.filter(h => h.id !== id))
    const adapter = adapterRef?.current
    if (adapter) {
      try {
        adapter.clearHighlights()
        for (const hl of remaining) {
          await adapter.addHighlight({ location: hl.cfiRange, text: hl.text, color: hl.color })
        }
      } catch (e) { logger.warn('[removeHighlight] adapter failed', e) }
      return
    }
    try {
      renditionRef.current?.annotations?.remove(cfiRange, 'highlight')
    } catch (e) { logger.warn('[removeHighlight] annotation remove failed', e) }
  }, [highlights])

  const clearSelection = useCallback(() => setSelectionInfo(null), [])

  return {
    bookmarks, setBookmarks,
    highlights, setHighlights,
    selectionInfo, setSelectionInfo,
    currentCfi, setCurrentCfi,
    toggleBookmark, removeBookmarkById,
    addHighlight, removeHighlight,
    clearSelection,
  }
}
