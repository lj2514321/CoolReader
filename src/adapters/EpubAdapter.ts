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
import type { ThemeMode, CustomTheme } from '../types'
import { themeStyles } from '../types'
import { generateCustomThemeCSS } from '../utils/customTheme'
import { logger } from '../utils/logger'

interface EpubAdapterOptions {
  layout: { fontSize: number; fontFamily: string; fontWeight?: number; lineHeight: number; margin: number; flow: 'paginated' | 'scrolled-doc' }
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
    const book = ePub(data)
    this.book = book
    await book.ready

    const nav = await book.loaded.navigation
    this.toc = this.mapToc(nav.toc)

    const rendition = book.renderTo(container, {
      width: '100%',
      height: '100%',
      spread: 'none',
      allowScriptedContent: true,
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
        style.id = '_reader_layout'
        doc.head.appendChild(style)
      }
      style.textContent = `
        body, body * {
          font-size: ${l.fontSize}% !important;
          font-family: ${l.fontFamily} !important;
          font-weight: ${l.fontWeight ?? 400} !important;
          line-height: ${l.lineHeight} !important;
        }
        body {
          padding: 0 ${l.margin}px !important;
          max-width: 100% !important;
        }
      `

      try {
        rendition.themes.select(this.theme)
      } catch (e) {
        logger.warn('[EpubAdapter content hook] theme re-select failed', e)
      }

      const selScript = doc.createElement('script')
      selScript.id = '_reader_sel'
      selScript.textContent = `
document.addEventListener('mouseup',function(){var s=window.getSelection();if(s&&!s.isCollapsed){var t=s.toString().trim();if(t.length>0){var r=s.getRangeAt(0).getBoundingClientRect();window.parent.postMessage({type:'reader-text-selected',text:t.slice(0,200),bounds:{top:r.top,left:r.left,width:r.width,height:r.height}},'*')}}})
`
      if (!doc.getElementById('_reader_sel')) {
        doc.head.appendChild(selScript)
      }
    })

    ;(['light', 'sepia', 'dark'] as const).forEach(th => rendition.themes.registerCss(th, themeStyles[th]))
    if (this.theme === 'custom') {
      rendition.themes.registerCss('custom', generateCustomThemeCSS(this.customTheme))
    }
    rendition.themes.select(this.theme)

    rendition.on('relocated', () => {
      this.notifyLocation()
    })

    // Selection message handler
    const messageHandler = (e: MessageEvent) => {
      if (e.data?.type === 'reader-text-selected' && this.onSelectionChange) {
        setTimeout(() => {
          const iframe = container.querySelector<HTMLIFrameElement>('iframe')
          const sel = iframe?.contentDocument?.getSelection()
          if (!sel || sel.isCollapsed) {
            this.onSelectionChange({ selectedText: '', range: null })
            return
          }
          const range = sel.getRangeAt(0)
          if (!this.rendition || typeof this.rendition.getCfiFromRange !== 'function') {
            this.onSelectionChange({ selectedText: e.data.text, range: null })
            return
          }
          try {
            const cfiRange = this.rendition.getCfiFromRange(range)
            this.onSelectionChange({
              selectedText: e.data.text,
              range: { location: cfiRange, text: e.data.text, color: '#ffeb3b' },
            })
          } catch (err) {
            logger.warn('[EpubAdapter selection] getCfiFromRange failed', err)
          }
        }, 50)
      }
    }
    window.addEventListener('message', messageHandler)
    ;(this as any)._messageHandler = messageHandler
  }

  destroy(): void {
    if ((this as any)._messageHandler) {
      window.removeEventListener('message', (this as any)._messageHandler)
      ;(this as any)._messageHandler = null
    }
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
    const progress = count > 0 ? Math.round((idx / count) * 100) : 0
    const spineItems = this.book?.spine?.items
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
      const text = await this.book.archive.getText(item.href)
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
    if (!this.book) return []
    // Use epub.js's built-in search if available
    try {
      // @ts-ignore — search is available on book
      const results = await this.book.search(query)
      if (!Array.isArray(results)) return []
      return results.map((r: any) => ({
        location: r.cfi || '',
        label: r.excerpt || '',
        excerpt: r.excerpt || '',
      }))
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
    if (!this.rendition) return
    try {
      if (typeof this.rendition.annotations?.remove === 'function') {
        // Remove all by iterating known highlights
        this.highlightIdMap.forEach(cfiRange => {
          try {
            this.rendition!.annotations.remove(cfiRange, 'highlight')
          } catch { /* ignore */ }
        })
      }
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
        range: { location: cfiRange, text, color: '#ffeb3b' },
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
}
