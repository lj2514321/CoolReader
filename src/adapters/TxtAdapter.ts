import type {
  BookAdapter,
  BookLocation,
  TocItem,
  SearchResult,
  HighlightSpec,
  SelectionInfo,
} from './BookAdapter'
import type { ThemeMode, CustomTheme } from '../types'
import { generateCustomThemeCSS } from '../utils/customTheme'
import { themeStyles } from '../types'
import { logger } from '../utils/logger'

/**
 * TXT format adapter. Splits text by ≥2 blank lines into "chapters",
 * renders into a div with manual pagination by viewport height.
 */
export class TxtAdapter implements BookAdapter {
  readonly format = 'txt' as const

  private filePath = ''
  private chapters: string[] = []
  private fullText = ''
  private chapterOffsets: number[] = [] // cumulative char offset where each chapter starts in fullText
  private container: HTMLElement | null = null
  private chapterIdx = 0
  private charOffset = 0
  private layout: { fontSize: number; fontFamily: string; lineHeight: number; margin: number; flow: 'paginated' | 'scrolled-doc' }
  private theme: ThemeMode
  private customTheme: CustomTheme
  private highlightIdCounter = 0
  private highlightIdMap = new Map<string, { chapterIdx: number; start: number; end: number; color: string }>()
  // DOM mark elements by id for removal
  private highlightElements = new Map<string, HTMLElement[]>()

  constructor(opts: {
    layout: { fontSize: number; fontFamily: string; lineHeight: number; margin: number; flow: 'paginated' | 'scrolled-doc' }
    theme: ThemeMode
    customTheme: CustomTheme
  }) {
    this.layout = opts.layout
    this.theme = opts.theme
    this.customTheme = opts.customTheme
  }

  async open(filePath: string, container: HTMLElement): Promise<void> {
    this.filePath = filePath
    this.container = container
    this.destroy()

    const buffer = await window.electronAPI!.readFile(filePath)
    // Detect encoding and decode
    let text: string
    try {
      // chardet runs in main process only — request encoding via IPC
      // For now, use a simple heuristic: try UTF-8 first, then fall back to GB18030
      const decoder = new TextDecoder('utf-8', { fatal: false })
      text = decoder.decode(buffer)
      // Check for replacement chars indicating non-UTF-8
      if (text.includes('\uFFFD')) {
        try {
          const gbDecoder = new TextDecoder('gb18030', { fatal: false })
          text = gbDecoder.decode(buffer)
        } catch {
          // Keep UTF-8 result
        }
      }
    } catch (e) {
      logger.warn('[TxtAdapter open] decode failed, using utf-8', e)
      text = new TextDecoder('utf-8').decode(buffer)
    }

    this.fullText = text
    // Split by ≥2 blank lines (allowing whitespace between newlines)
    this.chapters = text
      .split(/\n[ \t]*\n[ \t]*\n?/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
    if (this.chapters.length === 0) {
      // Fallback: single chapter = entire text
      this.chapters = [text]
    }

    // Compute cumulative offsets for location string -> full position lookup
    this.chapterOffsets = [0]
    for (let i = 0; i < this.chapters.length; i++) {
      this.chapterOffsets.push(this.chapterOffsets[i] + this.chapters[i].length + 2) // +2 for separator
    }

    this.renderCurrentChapter()
  }

  destroy(): void {
    if (this.container) {
      this.container.innerHTML = ''
    }
    this.chapters = []
    this.fullText = ''
    this.chapterOffsets = []
    this.highlightIdMap.clear()
    this.highlightElements.clear()
  }

  async next(): Promise<void> {
    if (!this.container) return
    if (this.charOffset + this.visibleCharsPerPage() < this.chapters[this.chapterIdx].length) {
      this.charOffset += this.visibleCharsPerPage()
    } else if (this.chapterIdx < this.chapters.length - 1) {
      this.chapterIdx++
      this.charOffset = 0
    } else {
      return // at end
    }
    this.renderCurrentChapter()
  }

  async prev(): Promise<void> {
    if (!this.container) return
    if (this.charOffset > 0) {
      this.charOffset = Math.max(0, this.charOffset - this.visibleCharsPerPage())
    } else if (this.chapterIdx > 0) {
      this.chapterIdx--
      this.charOffset = 0
    } else {
      return
    }
    this.renderCurrentChapter()
  }

  async goToLocation(location: string): Promise<void> {
    // Format: 'chapterIdx:charOffset' or just 'chapterIdx'
    const parts = location.split(':')
    const idx = parseInt(parts[0], 10)
    const offset = parts[1] ? parseInt(parts[1], 10) : 0
    if (isNaN(idx) || idx < 0 || idx >= this.chapters.length) return
    this.chapterIdx = idx
    this.charOffset = isNaN(offset) ? 0 : Math.min(offset, this.chapters[idx].length)
    this.renderCurrentChapter()
  }

  getCurrentLocation(): BookLocation {
    const totalChars = this.chapters.reduce((sum, c) => sum + c.length, 0) || 1
    const charsRead = this.chapterOffsets[this.chapterIdx] + this.charOffset
    const progress = Math.round((charsRead / totalChars) * 100)
    return {
      format: 'txt',
      location: `${this.chapterIdx}:${this.charOffset}`,
      chapterIdx: this.chapterIdx,
      progress,
      chapterLabel: this.chapters[this.chapterIdx]?.slice(0, 20) || '',
    }
  }

  getToc(): TocItem[] {
    return this.chapters.map((c, i) => ({
      label: `第 ${i + 1} 段${c.length > 0 ? `: ${c.slice(0, 16).replace(/\s+/g, ' ')}` : ''}`,
      location: `${i}:0`,
    }))
  }

  async getChapterText(idx: number): Promise<string> {
    return this.chapters[idx] || ''
  }

  async getFullText(): Promise<string> {
    return this.fullText
  }

  getChapterCount(): number {
    return this.chapters.length
  }

  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim()) return []
    const results: SearchResult[] = []
    const lowerQuery = query.toLowerCase()
    for (let i = 0; i < this.chapters.length; i++) {
      const ch = this.chapters[i]
      const lowerCh = ch.toLowerCase()
      let pos = 0
      while ((pos = lowerCh.indexOf(lowerQuery, pos)) !== -1) {
        const start = Math.max(0, pos - 20)
        const end = Math.min(ch.length, pos + query.length + 20)
        const before = ch.slice(start, pos)
        const match = ch.slice(pos, pos + query.length)
        const after = ch.slice(pos + query.length, end)
        results.push({
          location: `${i}:${pos}`,
          label: `第 ${i + 1} 段`,
          excerpt: `${before}${match}${after}`.replace(/\s+/g, ' '),
        })
        pos += query.length
        if (results.length >= 200) break // safety cap
      }
      if (results.length >= 200) break
    }
    return results
  }

  async addHighlight(spec: HighlightSpec): Promise<string> {
    const id = `txt-hl-${++this.highlightIdCounter}`
    // Parse location: 'chapterIdx:startOffset-endOffset' or 'chapterIdx:offset' (single position)
    const match = spec.location.match(/^(\d+):(\d+)(?:-(\d+))?$/)
    if (!match) return ''
    const chIdx = parseInt(match[1], 10)
    const start = parseInt(match[2], 10)
    const end = match[3] ? parseInt(match[3], 10) : start + spec.text.length
    if (chIdx !== this.chapterIdx) return '' // only current chapter
    this.highlightIdMap.set(id, { chapterIdx: chIdx, start, end, color: spec.color })
    this.applyHighlightInDom(id, start, end, spec.color)
    return id
  }

  async removeHighlight(id: string): Promise<void> {
    const els = this.highlightElements.get(id) || []
    // Replace <mark> with its text content
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
    if (!this.container) return
    this.injectThemeStyles(theme, null)
  }

  applyCustomThemeCSS(css: string): void {
    if (!this.container) return
    this.injectThemeStyles(this.theme, css)
  }

  getSelectionInfo(): SelectionInfo {
    if (!this.container) return { selectedText: '', range: null }
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return { selectedText: '', range: null }
    const text = sel.toString().trim()
    if (!text) return { selectedText: '', range: null }
    const range = sel.getRangeAt(0)
    // Calculate char offset within the current chapter
    const container = this.container.querySelector('[data-txt-content]') as HTMLElement | null
    if (!container) return { selectedText: text, range: null }
    // Use textContent from container start to range.startContainer
    const preRange = document.createRange()
    preRange.setStart(container, 0)
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

  private renderCurrentChapter(): void {
    if (!this.container) return
    const chapter = this.chapters[this.chapterIdx] || ''
    // Render entire chapter as pre-wrapped text. Pagination is logical (charOffset page jumps)
    // For a real paging experience we'd need a viewport-aware renderer; for v1 we render
    // the full chapter but expose next/prev as "scroll by page" no-ops if already at boundaries.
    this.container.innerHTML = ''
    const pre = document.createElement('div')
    pre.setAttribute('data-txt-content', '')
    pre.setAttribute('data-txt-chapter', String(this.chapterIdx))
    pre.style.cssText = `
      white-space: pre-wrap;
      word-wrap: break-word;
      padding: 24px ${this.layout.margin}px;
      font-size: ${this.layout.fontSize}%;
      font-family: ${this.layout.fontFamily};
      line-height: ${this.layout.lineHeight};
      max-width: 100%;
      box-sizing: border-box;
      overflow-y: auto;
      height: 100%;
    `
    pre.textContent = chapter
    this.container.appendChild(pre)
    this.injectThemeStyles(this.theme, null)
    // Re-apply existing highlights for this chapter
    this.highlightIdMap.forEach((hl, id) => {
      if (hl.chapterIdx === this.chapterIdx) {
        this.applyHighlightInDom(id, hl.start, hl.end, hl.color)
      }
    })
  }

  private applyHighlightInDom(id: string, start: number, end: number, color: string): void {
    if (!this.container) return
    const textNode = this.container.querySelector('[data-txt-content]')?.firstChild
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return
    const text = textNode.textContent || ''
    if (start >= text.length) return
    const safeEnd = Math.min(end, text.length)
    const before = text.slice(0, start)
    const match = text.slice(start, safeEnd)
    const after = text.slice(safeEnd)
    const parent = textNode.parentNode
    if (!parent) return
    parent.innerHTML = ''
    if (before) parent.appendChild(document.createTextNode(before))
    const mark = document.createElement('mark')
    mark.style.cssText = `background: ${color}; color: inherit; padding: 0;`
    mark.textContent = match
    parent.appendChild(mark)
    if (after) parent.appendChild(document.createTextNode(after))
    this.highlightElements.set(id, [mark])
  }

  private injectThemeStyles(theme: ThemeMode, customCss: string | null): void {
    if (!this.container) return
    let styleEl = this.container.querySelector<HTMLStyleElement>('style[data-txt-theme]')
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.setAttribute('data-txt-theme', '')
      this.container.appendChild(styleEl)
    }
    let css = ''
    if (theme === 'light') css = themeStyles.light
    else if (theme === 'dark') css = themeStyles.dark
    else if (theme === 'sepia') css = themeStyles.sepia
    else if (theme === 'custom' && customCss) css = customCss
    else if (theme === 'custom' && this.customTheme) css = generateCustomThemeCSS(this.customTheme)
    // Scope to the txt content div
    styleEl.textContent = `[data-txt-content] { ${css} }`
  }

  private visibleCharsPerPage(): number {
    // Rough estimate: container height / line height in chars
    if (!this.container) return 1000
    const height = this.container.clientHeight || 600
    const fontSizePct = this.layout.fontSize
    // Approx 16px base * fontSize% * 0.6 width per char * lineHeight lines per height
    const lineHeight = this.layout.lineHeight
    const approxCharHeight = 16 * (fontSizePct / 100) * lineHeight
    const lines = Math.max(1, Math.floor(height / approxCharHeight))
    const charsPerLine = 60 // conservative
    return lines * charsPerLine
  }
}
