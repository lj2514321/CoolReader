import { initMobiFile, type Mobi } from '@lingo-reader/mobi-parser'
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

/**
 * MOBI format adapter. Uses @lingo-reader/mobi-parser for parsing,
 * renders chapters in an iframe (XSS safety for arbitrary HTML).
 */
export class MobiAdapter implements BookAdapter {
  readonly format = 'mobi' as const

  private mobi: Mobi | null = null
  private filePath = ''
  private spine: Array<{ id: string; text: string; start: number; end: number; size: number }> = []
  private toc: Array<{ label: string; href: string; subitems?: Array<{ label: string; href: string }> }> = []
  private chapterIdx = 0
  private charOffset = 0
  private iframe: HTMLIFrameElement | null = null
  private iframeDoc: Document | null = null
  private layout: { fontSize: number; fontFamily: string; fontWeight?: number; lineHeight: number; margin: number; flow: 'paginated' | 'scrolled-doc' }
  private theme: ThemeMode
  private customTheme: CustomTheme
  private highlightIdCounter = 0
  private highlightIdMap = new Map<string, { chapterIdx: number; start: number; end: number; color: string }>()
  private highlightElements = new Map<string, HTMLElement[]>()
  private scrollOffset = 0

  constructor(opts: {
    layout: { fontSize: number; fontFamily: string; fontWeight?: number; lineHeight: number; margin: number; flow: 'paginated' | 'scrolled-doc' }
    theme: ThemeMode
    customTheme: CustomTheme
  }) {
    this.layout = opts.layout
    this.theme = opts.theme
    this.customTheme = opts.customTheme
  }

  async open(filePath: string, container: HTMLElement): Promise<void> {
    this.filePath = filePath
    this.destroy()
    container.innerHTML = ''

    const buffer = await window.electronAPI!.readFile(filePath)
    // mobi-parser expects Uint8Array; ArrayBuffer is fine via view
    const uint8 = new Uint8Array(buffer)
    try {
      this.mobi = await initMobiFile(uint8)
    } catch (e) {
      // DRM-encrypted files throw here
      const msg = String(e)
      if (msg.toLowerCase().includes('drm') || msg.toLowerCase().includes('encryption')) {
        throw new Error('不支持 DRM 加密文件，请用 Calibre 等工具去 DRM')
      }
      throw e
    }

    // Get spine and TOC
    const rawSpine = this.mobi.getSpine()
    this.spine = rawSpine.map(s => ({
      id: s.id,
      text: s.text,
      start: s.start,
      end: s.end,
      size: s.size,
    }))
    const rawToc = this.mobi.getToc()
    this.toc = this.mapToc(rawToc)

    // Create iframe for XSS-safe rendering
    this.iframe = document.createElement('iframe')
    this.iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      background: transparent;
    `
    this.iframe.setAttribute('sandbox', 'allow-same-origin')
    this.iframe.setAttribute('title', 'mobi-reader')
    container.appendChild(this.iframe)
    this.iframeDoc = this.iframe.contentDocument
    if (!this.iframeDoc) {
      throw new Error('MobiAdapter: failed to access iframe document')
    }

    this.renderCurrentChapter()
  }

  destroy(): void {
    try {
      this.mobi?.destroy()
    } catch (e) {
      logger.warn('[MobiAdapter destroy] mobi.destroy failed', e)
    }
    this.mobi = null
    this.spine = []
    this.toc = []
    this.iframe = null
    this.iframeDoc = null
    this.highlightIdMap.clear()
    this.highlightElements.clear()
  }

  async next(): Promise<void> {
    const body = this.getIframeBody()
    if (body && this.iframe) {
      const viewportH = this.iframe.clientHeight
      const maxScroll = body.scrollHeight - viewportH
      if (body.scrollTop < maxScroll - 1) {
        this.scrollOffset = Math.min(body.scrollTop + viewportH, maxScroll)
        this.iframe.contentWindow!.scrollTo(0, this.scrollOffset)
        return
      }
    }
    if (this.chapterIdx < this.spine.length - 1) {
      this.chapterIdx++
      this.scrollOffset = 0
      this.charOffset = 0
      this.renderCurrentChapter()
    }
  }

  async prev(): Promise<void> {
    const body = this.getIframeBody()
    if (body && this.iframe && body.scrollTop > 1) {
      const viewportH = this.iframe.clientHeight
      this.scrollOffset = Math.max(body.scrollTop - viewportH, 0)
      this.iframe.contentWindow!.scrollTo(0, this.scrollOffset)
      return
    }
    if (this.chapterIdx > 0) {
      this.chapterIdx--
      this.charOffset = 0
      this.scrollOffset = 0
      this.renderCurrentChapter()
      // Scroll to the bottom of the previous chapter
      const prevBody = this.getIframeBody()
      if (prevBody && this.iframe) {
        const maxScroll = prevBody.scrollHeight - this.iframe.clientHeight
        if (maxScroll > 0) {
          this.scrollOffset = maxScroll
          this.iframe.contentWindow!.scrollTo(0, this.scrollOffset)
        }
      }
    }
  }

  async goToLocation(location: string): Promise<void> {
    // Format: 'chapterIdx:scrollTop'
    const parts = location.split(':')
    const idx = parseInt(parts[0], 10)
    if (isNaN(idx) || idx < 0 || idx >= this.spine.length) return
    const scrollTop = parts[1] ? parseInt(parts[1], 10) || 0 : 0
    this.scrollOffset = scrollTop
    if (idx !== this.chapterIdx) {
      this.chapterIdx = idx
      this.charOffset = 0
      this.renderCurrentChapter()
    }
    // Apply scroll position
    if (this.iframe && scrollTop > 0) {
      this.iframe.contentWindow!.scrollTo(0, scrollTop)
    }
  }

  getCurrentLocation(): BookLocation {
    const progress = this.spine.length > 0 ? Math.round((this.chapterIdx / this.spine.length) * 100) : 0
    const current = this.spine[this.chapterIdx]
    // Sync scrollOffset with actual iframe scroll position
    if (this.iframe) {
      const body = this.getIframeBody()
      if (body) this.scrollOffset = body.scrollTop
    }
    return {
      format: 'mobi',
      location: `${this.chapterIdx}:${this.scrollOffset}`,
      chapterIdx: this.chapterIdx,
      progress,
      chapterLabel: this.findTocLabelForChapter(this.chapterIdx) || `Chapter ${this.chapterIdx + 1}`,
    }
  }

  getToc(): TocItem[] {
    return this.toc.map(t => ({
      label: t.label,
      location: this.findChapterByHref(t.href),
      subitems: t.subitems?.map(s => ({
        label: s.label,
        location: this.findChapterByHref(s.href),
      })),
    }))
  }

  async getChapterText(idx: number): Promise<string> {
    if (!this.mobi) return ''
    const item = this.spine[idx]
    if (!item) return ''
    try {
      const ch = this.mobi.loadChapter(item.id)
      return ch?.html || ''
    } catch (e) {
      logger.warn('[MobiAdapter getChapterText]', e)
      return ''
    }
  }

  async getFullText(): Promise<string> {
    if (!this.mobi) return ''
    const parts: string[] = []
    for (let i = 0; i < this.spine.length; i++) {
      const t = await this.getChapterText(i)
      // Strip HTML tags for plain text representation
      const plain = t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      parts.push(plain)
    }
    return parts.join('\n\n')
  }

  getChapterCount(): number {
    return this.spine.length
  }

  async search(query: string): Promise<SearchResult[]> {
    if (!this.mobi || !query.trim()) return []
    const results: SearchResult[] = []
    const lowerQuery = query.toLowerCase()
    for (let i = 0; i < this.spine.length; i++) {
      const html = await this.getChapterText(i)
      const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const lowerPlain = plain.toLowerCase()
      let pos = 0
      while ((pos = lowerPlain.indexOf(lowerQuery, pos)) !== -1) {
        const start = Math.max(0, pos - 20)
        const end = Math.min(plain.length, pos + query.length + 20)
        const before = plain.slice(start, pos)
        const match = plain.slice(pos, pos + query.length)
        const after = plain.slice(pos + query.length, end)
        results.push({
          location: `${i}:${pos}`,
          label: `Chapter ${i + 1}`,
          excerpt: `${before}${match}${after}`.replace(/\s+/g, ' '),
        })
        pos += query.length
        if (results.length >= 200) break
      }
      if (results.length >= 200) break
    }
    return results
  }

  async addHighlight(spec: HighlightSpec): Promise<string> {
    const id = `mobi-hl-${++this.highlightIdCounter}`
    const match = spec.location.match(/^(\d+):(\d+)(?:-(\d+))?$/)
    if (!match) return ''
    const chIdx = parseInt(match[1], 10)
    const start = parseInt(match[2], 10)
    const end = match[3] ? parseInt(match[3], 10) : start + spec.text.length
    if (isNaN(chIdx) || chIdx < 0 || chIdx >= this.spine.length) return ''
    // Always store so highlights survive chapter switches
    this.highlightIdMap.set(id, { chapterIdx: chIdx, start, end, color: spec.color })
    if (chIdx === this.chapterIdx) {
      this.applyHighlightInDom(id, start, end, spec.color)
    }
    return id
  }

  async removeHighlight(id: string): Promise<void> {
    const els = this.highlightElements.get(id) || []
    els.forEach(el => {
      const parent = el.parentNode
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el)
        parent.removeChild(el)
      }
    })
    this.highlightElements.delete(id)
    this.highlightIdMap.delete(id)
  }

  clearHighlights(): void {
    for (const id of Array.from(this.highlightElements.keys())) {
      void this.removeHighlight(id)
    }
  }

  applyTheme(theme: ThemeMode): void {
    this.theme = theme
    this.injectThemeStyles(theme, null)
  }

  applyCustomThemeCSS(css: string): void {
    this.injectThemeStyles(this.theme, css)
  }

  applyLayout(): void {
    if (!this.iframeDoc?.body) return
    const l = this.layout
    const body = this.iframeDoc.body
    body.style.fontSize = `${l.fontSize}%`
    body.style.fontFamily = l.fontFamily
    body.style.fontWeight = String(l.fontWeight ?? 400)
    body.style.lineHeight = String(l.lineHeight)
    body.style.padding = `24px ${l.margin}px`
  }

  flow(_mode: 'paginated' | 'scrolled-doc'): void {
    // MOBI adapter uses iframe rendering; flow mode is not applicable.
  }

  resize(): void {
    // Re-render to adjust to new viewport size.
    this.renderCurrentChapter()
  }

  getSelectionInfo(): SelectionInfo {
    if (!this.iframeDoc) return { selectedText: '', range: null }
    const sel = this.iframeDoc.getSelection()
    if (!sel || sel.isCollapsed) return { selectedText: '', range: null }
    const text = sel.toString().trim()
    if (!text) return { selectedText: '', range: null }
    const range = sel.getRangeAt(0)
    // Get plain text offset by traversing the body
    const body = this.iframeDoc.body
    if (!body) return { selectedText: text, range: null }
    const preRange = this.iframeDoc.createRange()
    preRange.setStart(body, 0)
    preRange.setEnd(range.startContainer, range.startOffset)
    const startOffset = preRange.toString().length
    return {
      selectedText: text,
      range: {
        location: `${this.chapterIdx}:${startOffset}-${startOffset + text.length}`,
        text,
        color: '#ffeb3b',
      },
    }
  }

  // ---- Internal ----

  private getIframeBody(): HTMLElement | null {
    return this.iframe?.contentDocument?.body ?? null
  }

  private renderCurrentChapter(): void {
    if (!this.iframeDoc || !this.mobi) return
    const item = this.spine[this.chapterIdx]
    if (!item) return
    const ch = this.mobi.loadChapter(item.id)
    const html = ch?.html || '<p>Empty chapter</p>'

    this.iframeDoc.open()
    this.iframeDoc.write(`<!DOCTYPE html><html><head><style>
      body {
        margin: 0;
        padding: 24px ${this.layout.margin}px;
        font-size: ${this.layout.fontSize}%;
        font-family: ${this.layout.fontFamily};
        font-weight: ${this.layout.fontWeight ?? 400};
        line-height: ${this.layout.lineHeight};
        word-wrap: break-word;
        overflow-y: auto;
      }
      img { max-width: 100%; height: auto; }
    </style></head><body>${html}</body></html>`)
    this.iframeDoc.close()
    this.iframe?.contentWindow?.scrollTo(0, this.scrollOffset)

    this.injectThemeStyles(this.theme, null)
    // Track iframe scroll position so syncRef can pick it up for progress saving
    const iframeBody = this.getIframeBody()
    if (iframeBody) {
      iframeBody.addEventListener('scroll', () => {
        this.scrollOffset = iframeBody.scrollTop
      }, { passive: true })
    }
    // Re-apply existing highlights for this chapter
    this.highlightIdMap.forEach((hl, id) => {
      if (hl.chapterIdx === this.chapterIdx) {
        this.applyHighlightInDom(id, hl.start, hl.end, hl.color)
      }
    })
  }

  private applyHighlightInDom(id: string, start: number, end: number, color: string): void {
    if (!this.iframeDoc?.body) return
    const body = this.iframeDoc.body
    // Walk text nodes to find position [start, end] in the body
    const walker = this.iframeDoc.createTreeWalker(body, NodeFilter.SHOW_TEXT, null)
    let pos = 0
    let startNode: Text | null = null
    let startOffset = 0
    let endNode: Text | null = null
    let endOffset = 0
    let node = walker.nextNode() as Text | null
    while (node) {
      const len = node.textContent?.length || 0
      if (!startNode && pos + len >= start) {
        startNode = node
        startOffset = start - pos
      }
      if (pos + len >= end) {
        endNode = node
        endOffset = end - pos
        break
      }
      pos += len
      node = walker.nextNode() as Text | null
    }
    if (!startNode || !endNode) return

    try {
      const range = this.iframeDoc.createRange()
      range.setStart(startNode, startOffset)
      range.setEnd(endNode, endOffset)
      const mark = this.iframeDoc.createElement('mark')
      mark.style.cssText = `background: ${color}; color: inherit; padding: 0;`
      range.surroundContents(mark)
      this.highlightElements.set(id, [mark])
    } catch (e) {
      logger.warn('[MobiAdapter applyHighlightInDom] surroundContents failed', e)
    }
  }

  private injectThemeStyles(theme: ThemeMode, customCss: string | null): void {
    if (!this.iframeDoc) return
    let styleEl = this.iframeDoc.querySelector<HTMLStyleElement>('style[data-mobi-theme]')
    if (!styleEl) {
      styleEl = this.iframeDoc.createElement('style')
      styleEl.setAttribute('data-mobi-theme', '')
      this.iframeDoc.head?.appendChild(styleEl)
    }
    let css = ''
    if (theme === 'light') css = themeStyles.light
    else if (theme === 'dark') css = themeStyles.dark
    else if (theme === 'sepia') css = themeStyles.sepia
    else if (theme === 'custom' && customCss) css = customCss
    else if (theme === 'custom' && this.customTheme) css = generateCustomThemeCSS(this.customTheme)
    styleEl.textContent = css
  }

  private mapToc(items: any[]): Array<{ label: string; href: string; subitems?: any[] }> {
    return items.map(t => ({
      label: t.label || '',
      href: t.href || '',
      subitems: t.subitems ? this.mapToc(t.subitems) : undefined,
    }))
  }

  private findChapterByHref(href: string): string {
    // Best-effort: find spine index by matching href in chapter text
    if (!href) return '0:0'
    for (let i = 0; i < this.spine.length; i++) {
      if (this.spine[i].text.includes(href) || this.spine[i].id === href) {
        return `${i}:0`
      }
    }
    return '0:0'
  }

  private findTocLabelForChapter(chapterIdx: number): string {
    const spineId = this.spine[chapterIdx]?.id
    if (!spineId) return ''
    const search = (items: typeof this.toc): string => {
      for (const item of items) {
        if (item.href === spineId || this.spine[chapterIdx]?.text.includes(item.href)) {
          return item.label
        }
        if (item.subitems) {
          const found = search(item.subitems)
          if (found) return found
        }
      }
      return ''
    }
    return search(this.toc)
  }
}
