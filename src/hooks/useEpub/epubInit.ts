import { NavItem, ReaderLayout, Bookmark, Highlight } from '../../types'
import { loadProgress, loadSetting, loadBookmarks as dbLoadBookmarks, loadHighlights as dbLoadHighlights } from '../../utils/db'
import { logger } from '../../utils/logger'
import type { NavItem as EpubNavItem } from 'epubjs/types/navigation'
import type { Rendition } from 'epubjs'

// ─── TOC mapping ───────────────────────────────────────────────────────────────

export function mapToc(items: EpubNavItem[]): NavItem[] {
  return items.map((item: EpubNavItem) => ({
    label: item.label,
    href: item.href,
    subitems: item.subitems ? mapToc(item.subitems) : undefined,
  }))
}

// ─── Layout restoration ────────────────────────────────────────────────────────

export async function restoreLayout(
  setLayoutState: (l: ReaderLayout) => void,
  layoutRef: React.MutableRefObject<ReaderLayout>
): Promise<void> {
  let savedLayout: string | null = null
  try {
    savedLayout = await loadSetting('readerLayout')
  } catch (e) { logger.warn('[restoreLayout] load layout failed', e) }
  if (savedLayout) {
    try {
      const parsed = JSON.parse(savedLayout) as ReaderLayout
      layoutRef.current = parsed
      setLayoutState(parsed)
    } catch (e) { logger.warn('[restoreLayout] parse savedLayout failed', e) }
  }
}

// ─── Progress loading ──────────────────────────────────────────────────────────

export async function loadSavedProgress(bookId: string): Promise<{ progress: number; cfi: string; index: number } | null> {
  try {
    return await loadProgress(bookId)
  } catch (e) { logger.warn('[loadSavedProgress] failed', e); return null }
}

// ─── Annotation loading ────────────────────────────────────────────────────────

export async function restoreAnnotations(
  bookId: string,
  setBookmarks: React.Dispatch<React.SetStateAction<Bookmark[]>>,
  setHighlights: React.Dispatch<React.SetStateAction<Highlight[]>>,
  rendition: Rendition
): Promise<void> {
  try {
    const bms = await dbLoadBookmarks(bookId)
    setBookmarks(bms)
    const hls = await dbLoadHighlights(bookId)
    setHighlights(hls)
    hls.forEach(hl => {
      try {
        if (rendition && typeof rendition.annotations?.highlight === 'function') {
          rendition.annotations.highlight(hl.cfiRange, {}, () => {}, 'epub-highlight', { fill: hl.color, 'fill-opacity': '0.3' })
        }
      } catch (e) { logger.warn('[restoreAnnotations] restore highlight failed', e) }
    })
  } catch (e) { logger.warn('[restoreAnnotations] load bookmarks/highlights failed', e) }
}
