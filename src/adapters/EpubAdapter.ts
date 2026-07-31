import ePub, { Book, Rendition, View } from 'epubjs'
import type { EpubNavItem } from 'epubjs/types/navigation'
import type {
  BookAdapter,
  BookLocation,
  TocItem,
  SearchResult,
  HighlightSpec,
  SelectionInfo,
} from './BookAdapter'
import type { ThemeMode, CustomTheme, ReaderLayout } from '../types'
import { themeStyles, highlightColors } from '../types'
import { generateCustomThemeCSS } from '../utils/customTheme'
import { logger } from '../utils/logger'
import { bindReaderDocumentEvents } from '../utils/readerContentEvents'
import { calculateSectionProgress } from '../utils/readerProgress'

interface EpubAdapterOptions {
  layout: ReaderLayout
  customTheme: CustomTheme
  theme: ThemeMode
  onLocationChange?: (loc: BookLocation) => void
  onSelectionChange?: (info: SelectionInfo) => void
  onHighlightsLoaded?: (existing: HighlightSpec[]) => void
}

/**
 * Adapter that wraps the existing epub.js rendering pipeline.
 * This is a thin wrapper — all epub-specific logic stays here.
 */
export class EpubAdapter implements BookAdapter {
  readonly format = 'epub' as const

  private book: Book | null = null
  private rendition: Rendition | null = null
  private filePath = ''
  private toc: TocItem[] = []
  private layout: EpubAdapterOptions['layout']
  private customTheme: CustomTheme
  private theme: ThemeMode
  private onLocationChange?: (loc: BookLocation) => void
  private onSelectionChange?: (info: SelectionInfo) => void
  private highlightIdCounter = 0
  private highlightIdMap = new Map<string, string>() // id -> cfiRange

  constructor(opts: EpubAdapterOptions) {
    this.layout = opts.layout
    this.customTheme = opts.customTheme
    this.theme = opts.theme
    this.onLocationChange = opts.onLocationChange
    this.onSelectionChange = opts.onSelectionChange
  }

  async open(filePath: string, container: HTMLElement): Promise<void> {
    this.filePath = filePath
    this.destroy()

    const data = await window.electronAPI!.readFile(filePath)
    const buffer: ArrayBuffer = data instanceof ArrayBuffer ? data : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
    const book = ePub(buffer)
    this.book = book
    await book.ready

    const nav = await book.loaded.navigation
    this.toc = this.mapToc(nav.toc)

    const rendition = book.renderTo(container, {
      width: '100%',
      height: '100%',
      spread: 'none',
      allowScriptedContent: false,
      flow: this.layout.flow || 'paginated',
    })
    this.rendition = rendition

    rendition.hooks.content.register((view: View) => {
      const doc = view.document
      if (!doc || typeof doc.getElementById !== 'function') return
      const l = this.layout
      let style = doc.getElementById('_reader_layout') as HTMLStyleElement | null
      if (!style) {
        style = doc.createElement('style')
        style!.id = '_reader_layout'
        doc.head.appendChild(style!)
      }
      style!.textContent = `
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
          font-weight: ${l.fontWeight ?? 400} !important;
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
        body p {
          margin: 0 0 1.4em 0 !important;
          text-indent: 0 !important;
        }
        body h1, body h2, body h3 {
          font-family: ${l.fontFamily} !important;
          font-weight: 500 !important;
          text-align: center !important;
          letter-spacing: 0.5px !important;
          margin: 1.5em 0 !important;
        }
        body h1 { font-size: 1.4em !important; }
        body h2 { font-size: 1.2em !important; }
        body h3 { font-size: 1.1em !important; }
        body *:not(h1):not(h2):not(h3):not(h4):not(h5):not(h6):not(code):not(pre) {
          font-family: ${l.fontFamily} !important;
        }
      `

      try {
        rendition.themes.select(this.theme)
      } catch (e) {
        logger.warn('[EpubAdapter content hook] theme re-select failed', e)
      }

      bindReaderDocumentEvents(doc)
      doc.addEventListener('mouseup', () => {
        const selection = doc.getSelection()
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) return
        const text = selection.toString().trim()
        if (!text || !this.onSelectionChange) return
        const range = selection.getRangeAt(0)
        try {
          const location = rendition.getCfiFromRange(range)
          this.onSelectionChange({ selectedText: text.slice(0, 200), range: { location, text, color: highlightColors[0] } })
        } catch (e) {
          logger.warn('[EpubAdapter selection] getCfiFromRange failed', e)
        }
      })
    })

    ;(['light', 'sepia', 'dark'] as const).forEach(th => rendition.themes.registerCss(th, themeStyles[th]))
    if (this.theme === 'custom') {
      rendition.themes.registerCss('custom', generateCustomThemeCSS(this.customTheme))
    }
    rendition.themes.select(this.theme)

    rendition.on('relocated', () => {
      this.notifyLocation()
    })

  }

  destroy(): void {
    try {
      this.rendition?.destroy()
    } catch (e) {
      logger.warn('[EpubAdapter destroy] rendition failed', e)
    }
    try {
      this.book?.destroy()
    } catch (e) {
      logger.warn('[EpubAdapter destroy] book failed', e)
    }
    this.rendition = null
    this.book = null
    this.toc = []
    this.highlightIdMap.clear()
  }

  async next(): Promise<void> {
    await this.rendition?.next()
  }

  async prev(): Promise<void> {
    await this.rendition?.prev()
  }

  async goToLocation(location: string): Promise<void> {
    if (!this.rendition) return
    const count = this.getChapterCount()
    // Try as CFI first
    try {
      await this.rendition.display(location)
      return
    } catch {
      // Fall through to index-based
    }
    const idx = parseInt(location, 10)
    if (!isNaN(idx) && idx >= 0 && idx < count) {
      await this.rendition.display(idx)
    }
  }

  getCurrentLocation(): BookLocation {
    const cur = this.rendition?.currentLocation()
    const count = this.getChapterCount()
    const idx = Number(cur?.start?.index) || 0
    const cfi = cur?.start?.cfi || ''
    const runtimeLocation = cur as typeof cur & { atEnd?: boolean; start?: { displayed?: { page?: number; total?: number } } }
    const progress = calculateSectionProgress(idx, count, runtimeLocation?.start?.displayed, runtimeLocation?.atEnd)
    const spineItems = this.book?.spine?.items as Array<{ href?: string }> | undefined
    const href = spineItems?.[idx]?.href || ''
    return {
      format: 'epub',
      location: cfi || `${idx}`,
      chapterIdx: idx,
      progress,
      chapterLabel: href,
    }
  }

  getToc(): TocItem[] {
    return this.toc
  }

  async getChapterText(idx: number): Promise<string> {
    if (!this.book?.spine) return ''
    const spineItems = this.book.spine.items
    const item = spineItems[idx]
    if (!item) return ''
    try {
      // @ts-ignore — epubjs archive API
      const section = item as { url?: string; href?: string }
      const url = section.url || section.href
      if (!url) return ''
      const text = await this.book.archive.getText(url)
      return text || ''
    } catch (e) {
      logger.warn('[EpubAdapter getChapterText]', e)
      return ''
    }
  }

  async getFullText(): Promise<string> {
    if (!this.book?.spine) return ''
    const items = this.book.spine.items || []
    const parts: string[] = []
    for (let i = 0; i < items.length; i++) {
      const text = await this.getChapterText(i)
      parts.push(text)
    }
    return parts.join('\n\n')
  }

  getChapterCount(): number {
    if (!this.book?.spine) return 0
    return this.book.spine.length || this.book.spine.items?.length || 0
  }

  async search(query: string): Promise<SearchResult[]> {
    const normalizedQuery = query.trim()
    if (!this.book || !normalizedQuery) return []
    // Use epub.js's built-in search if available
    try {
      // @ts-ignore — search is available on book
      return await this.searchSections(normalizedQuery)
    } catch (e) {
      logger.warn('[EpubAdapter search]', e)
      return []
    }
  }

  async addHighlight(spec: HighlightSpec): Promise<string> {
    if (!this.rendition || typeof this.rendition.annotations?.highlight !== 'function') {
      return ''
    }
    const id = `hl-${++this.highlightIdCounter}`
    this.rendition.annotations.highlight(
      spec.location,
      {},
      () => {},
      'epub-highlight',
      { fill: spec.color, 'fill-opacity': '0.3' }
    )
    this.highlightIdMap.set(id, spec.location)
    return id
  }

  async removeHighlight(id: string): Promise<void> {
    if (!this.rendition) return
    const cfiRange = this.highlightIdMap.get(id)
    if (!cfiRange) return
    try {
      if (typeof this.rendition.annotations?.remove === 'function') {
        this.rendition.annotations.remove(cfiRange, 'highlight')
      }
    } catch (e) {
      logger.warn('[EpubAdapter removeHighlight]', e)
    }
    this.highlightIdMap.delete(id)
  }

  clearHighlights(): void {
    const rendition = this.rendition
    if (!rendition) return
    const annotations = rendition.annotations
    if (typeof annotations?.remove !== 'function') return
    try {
      // Remove all by iterating known highlights
      this.highlightIdMap.forEach(cfiRange => {
        try {
          annotations.remove(cfiRange, 'highlight')
        } catch { /* ignore */ }
      })
    } catch (e) {
      logger.warn('[EpubAdapter clearHighlights]', e)
    }
    this.highlightIdMap.clear()
  }

  applyTheme(theme: ThemeMode): void {
    this.theme = theme
    try {
      this.rendition?.themes.select(theme)
    } catch (e) {
      logger.warn('[EpubAdapter applyTheme]', e)
    }
  }

  applyCustomThemeCSS(css: string): void {
    try {
      this.rendition?.themes.registerCss('custom', css)
      if (this.theme === 'custom') {
        this.rendition?.themes.select('custom')
      }
    } catch (e) {
      logger.warn('[EpubAdapter applyCustomThemeCSS]', e)
    }
  }

  applyLayout(layout?: ReaderLayout): void {
    if (layout) this.layout = { ...layout }
    // Layout CSS is injected via the content hook in open() for NEW views.
    // For already-rendered views, update the _reader_layout style element directly.
    if (this.rendition) {
      try {
        this.rendition.themes.select(this.theme)
      } catch { /* ignore */ }
    }
    // Find the current iframe document and update or create the _reader_layout style element
    const iframe = (this.rendition as any).manager?.container?.querySelector?.('iframe') as HTMLIFrameElement | null
    if (iframe?.contentDocument) {
      const l = this.layout
      const css = `
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
          font-weight: ${l.fontWeight ?? 400} !important;
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
      let style = iframe.contentDocument.getElementById('_reader_layout') as HTMLStyleElement | null
      if (!style) {
        style = iframe.contentDocument.createElement('style')
        style.id = '_reader_layout'
        iframe.contentDocument.head.appendChild(style)
      }
      style.textContent = css
    }
  }

  flow(mode: 'paginated' | 'scrolled-doc'): void {
    try {
      this.layout = { ...this.layout, flow: mode }
      this.rendition?.flow(mode)
      this.applyLayout()
    } catch (e) {
      logger.warn('[EpubAdapter flow]', e)
    }
  }

  resize(): void {
    try {
      this.rendition?.resize()
    } catch (e) {
      logger.warn('[EpubAdapter resize]', e)
    }
  }

  getSelectionInfo(): SelectionInfo {
    if (!this.rendition) return { selectedText: '', range: null }
    const iframe = (this.rendition as any).manager?.container?.querySelector?.('iframe') as HTMLIFrameElement | null
    const sel = iframe?.contentDocument?.getSelection()
    if (!sel || sel.isCollapsed) return { selectedText: '', range: null }
    const text = sel.toString().trim()
    if (!text) return { selectedText: '', range: null }
    const range = sel.getRangeAt(0)
    try {
      if (typeof this.rendition.getCfiFromRange !== 'function') {
        return { selectedText: text, range: null }
      }
      const cfiRange = this.rendition.getCfiFromRange(range)
      return {
        selectedText: text,
        range: { location: cfiRange, text, color: highlightColors[0] },
      }
    } catch {
      return { selectedText: text, range: null }
    }
  }

  // Internal helpers

  private mapToc(items: EpubNavItem[]): TocItem[] {
    return items.map(item => ({
      label: item.label,
      location: item.href,
      subitems: item.subitems ? this.mapToc(item.subitems) : undefined,
    }))
  }

  private notifyLocation(): void {
    if (this.onLocationChange) {
      this.onLocationChange(this.getCurrentLocation())
    }
  }

  private async searchSections(query: string): Promise<SearchResult[]> {
    if (!this.book) return []
    const results: SearchResult[] = []
    const items = this.book.spine.items as unknown as Array<{
      index: number
      href?: string
      load(request: (url: string) => Promise<Document>): Promise<Element>
      search(query: string): Array<{ cfi?: string; excerpt?: string }>
      unload(): void
    }>
    const request = (this.book as unknown as { load(url: string): Promise<Document> }).load.bind(this.book)

    for (let i = 0; i < items.length && results.length < 200; i++) {
      const section = items[i]
      try {
        await section.load(request)
        for (const match of section.search(query)) {
          if (!match.cfi) continue
          const excerpt = match.excerpt || query
          const matchIndex = excerpt.toLocaleLowerCase().indexOf(query.toLocaleLowerCase())
          const contextBefore = matchIndex >= 0 ? excerpt.slice(0, matchIndex) : ''
          const matchText = matchIndex >= 0 ? excerpt.slice(matchIndex, matchIndex + query.length) : query
          const contextAfter = matchIndex >= 0 ? excerpt.slice(matchIndex + query.length) : ''
          results.push({
            location: match.cfi,
            label: this.findTocLabel(section.href) || `Chapter ${i + 1}`,
            excerpt,
            chapterIdx: section.index ?? i,
            contextBefore,
            matchText,
            contextAfter,
          })
          if (results.length >= 200) break
        }
      } catch (e) {
        logger.warn(`[EpubAdapter search] section ${i} failed`, e)
      } finally {
        section.unload()
      }
    }
    return results
  }

  private findTocLabel(href?: string): string {
    if (!href) return ''
    const normalized = href.split('#')[0]
    const visit = (items: TocItem[]): string => {
      for (const item of items) {
        const location = item.location.split('#')[0]
        if (location === normalized || location.endsWith(normalized) || normalized.endsWith(location)) return item.label
        const nested = item.subitems ? visit(item.subitems) : ''
        if (nested) return nested
      }
      return ''
    }
    return visit(this.toc)
  }

  // Accessors for useBookEngine (used during refactor transition)

  getBook(): Book | null {
    return this.book
  }

  getRendition(): Rendition | null {
    return this.rendition
  }

  getFilePath(): string {
    return this.filePath
  }

  /**
   * T4 pragmatic helper: populate the adapter from an already-initialized book/rendition.
   * Used by useBookEngine when migrating from inline epub.js setup to adapter pattern.
   * For TxtAdapter/MobiAdapter, the open() flow is used directly.
   */
  setBook(book: Book, rendition: Rendition, toc: TocItem[], filePath: string, layout: EpubAdapterOptions['layout'], theme: ThemeMode, customTheme: CustomTheme): void {
    this.book = book
    this.rendition = rendition
    this.toc = toc
    this.filePath = filePath
    this.layout = layout
    this.theme = theme
    this.customTheme = customTheme
  }
}
