import { useRef } from 'react'
import { Book, Rendition } from 'epubjs'
import { BookMeta, NavItem, ThemeMode, ReaderLayout, defaultLayout, CustomTheme, defaultCustomTheme } from '../../types'
import { useBookEngine, SharedRefs } from './useBookEngine'
import { useReaderControls } from './useReaderControls'
import { useAnnotations } from './useAnnotations'
import { useSearch } from './useSearch'

export function useEpub() {
  const shared: SharedRefs = {
    bookRef: useRef<Book | null>(null),
    renditionRef: useRef<Rendition | null>(null),
    syncRef: useRef<() => void>(() => {}),
    navigatingRef: useRef(false),
    progressRef: useRef(0),
    cfiRef: useRef(''),
    indexRef: useRef(0),
    sectionHrefRef: useRef(''),
    themeRef: useRef<ThemeMode>('light'),
    layoutRef: useRef<ReaderLayout>(defaultLayout),
    setLayoutStateRef: useRef<((layout: ReaderLayout) => void) | null>(null),
    totalSectionsRef: useRef(0),
    sessionStartRef: useRef(0),
    todaySecondsRef: useRef(0),
    bookTodayRef: useRef(0),
    bookSessionStartRef: useRef(0),
    bookPathRef: useRef(''),
    tocRef: useRef<NavItem[]>([]),
    searchIndexRef: useRef<{ href: string; text: string }[]>([]),
    hookRegistered: useRef(false),
    customThemeRef: useRef<CustomTheme>(defaultCustomTheme),
  }

  const annotations = useAnnotations(shared)
  const search = useSearch(shared)
  const controls = useReaderControls(shared)
  const bookEngine = useBookEngine(shared, {
    applyLayout: controls.applyLayout,
    saveBookReadingTime: controls.saveBookReadingTime,
    setCurrentCfi: annotations.setCurrentCfi,
    setBookmarks: annotations.setBookmarks,
    setHighlights: annotations.setHighlights,
    setSelectionInfo: annotations.setSelectionInfo,
  })

  return {
    // State
    meta: bookEngine.meta,
    toc: bookEngine.toc,
    theme: bookEngine.theme,
    progress: bookEngine.progress,
    layout: bookEngine.layout,
    bookmarks: annotations.bookmarks,
    highlights: annotations.highlights,
    selectionInfo: annotations.selectionInfo,
    currentCfi: annotations.currentCfi,
    customThemeRef: shared.customThemeRef,

    // Refs
    progressRef: shared.progressRef,
    cfiRef: shared.cfiRef,
    indexRef: shared.indexRef,
    sectionHrefRef: shared.sectionHrefRef,

    // Book lifecycle
    extractMeta: bookEngine.extractMeta,
    openBook: bookEngine.openBook,
    destroy: bookEngine.destroy,
    resizeViewer: bookEngine.resizeViewer,

    // Theme & layout
    setTheme: bookEngine.setTheme,
    setCustomTheme: bookEngine.setCustomTheme,
    setAnimationMode: bookEngine.setAnimationMode,
    setReducedMotion: bookEngine.setReducedMotion,
    updateLayout: controls.updateLayout,

    // Navigation
    goNext: controls.goNext,
    goPrev: controls.goPrev,
    goToHref: controls.goToHref,
    goToCfi: controls.goToCfi,
    seekTo: controls.seekTo,

    // Reading time
    getReadingSeconds: controls.getReadingSeconds,
    getBookReadingSeconds: controls.getBookReadingSeconds,
    initReadingTime: controls.initReadingTime,
    saveReadingTime: controls.saveReadingTime,
    saveBookReadingTime: controls.saveBookReadingTime,

    // Content extraction
    getChapterText: controls.getChapterText,
    getFullBookText: controls.getFullBookText,

    // Annotations
    toggleBookmark: annotations.toggleBookmark,
    removeBookmarkById: annotations.removeBookmarkById,
    addHighlight: annotations.addHighlight,
    removeHighlight: annotations.removeHighlight,
    clearSelection: annotations.clearSelection,

    // Search
    searchText: search.searchText,
    navigateToSearchResult: search.navigateToSearchResult,
    getChapterLabel: search.getChapterLabel,
  }
}
