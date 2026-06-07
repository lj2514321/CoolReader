import { useState, useCallback } from 'react'
import { Bookmark, Highlight } from '../../types'
import { addBookmark as dbAddBookmark, removeBookmark as dbRemoveBookmark, isBookmarked as dbIsBookmarked, addHighlight as dbAddHighlight, removeHighlight as dbRemoveHighlight, loadBookmarks as dbLoadBookmarks, loadHighlights as dbLoadHighlights } from '../../utils/db'
import type { SharedRefs } from './useBookEngine'
import { logger } from '../../utils/logger'

type UseAnnotationsRefs = SharedRefs | Pick<SharedRefs, 'bookRef' | 'renditionRef' | 'bookPathRef'>

export function useAnnotations(shared: UseAnnotationsRefs) {
  const { bookRef, renditionRef, bookPathRef } = shared

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [selectionInfo, setSelectionInfo] = useState<{ text: string; cfiRange: string; bounds: { top: number; left: number; width: number; height: number } } | null>(null)
  const [currentCfi, setCurrentCfi] = useState('')

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
    const id = await dbAddHighlight({ filePath: fp, cfiRange: info.cfiRange, location: info.cfiRange, text: info.text, note, color, createdAt: Date.now() })
    setHighlights(prev => [...prev, { id, filePath: fp, cfiRange: info.cfiRange, location: info.cfiRange, text: info.text, note, color, createdAt: Date.now() }])
    try {
      renditionRef.current?.annotations?.highlight(info.cfiRange, {}, () => {}, 'epub-highlight', { fill: color, 'fill-opacity': '0.3' })
    } catch (e) { logger.warn('[addHighlight] annotation highlight failed', e) }
    setSelectionInfo(null)
  }, [selectionInfo])

  const removeHighlight = useCallback(async (id: number, cfiRange: string) => {
    await dbRemoveHighlight(id)
    setHighlights(prev => prev.filter(h => h.id !== id))
    try {
      renditionRef.current?.annotations?.remove(cfiRange, 'highlight')
    } catch (e) { logger.warn('[removeHighlight] annotation remove failed', e) }
  }, [])

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
