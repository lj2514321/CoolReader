import type {
  BookAdapter,
  BookLocation,
  TocItem,
  SearchResult,
  HighlightSpec,
  SelectionInfo,
} from './BookAdapter'
import type { ThemeMode, CustomTheme, ReaderLayout } from '../types'
import { generateCustomThemeCSS } from '../utils/customTheme'
import { themeStyles, highlightColors } from '../types'
import { logger } from '../utils/logger'
import { alignPageScrollTop, calculatePageScrollStep } from '../utils/readerProgress'

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
  private layout: ReaderLayout
  private theme: ThemeMode
  private customTheme: CustomTheme
  private customThemeCss: string | null = null
  private highlightIdCounter = 0
  private highlightIdMap = new Map<string, { chapterIdx: number; start: number; end: number; color: string }>()
  // DOM mark elements by id for removal
  private highlightElements = new Map<string, HTMLElement[]>()

  constructor(opts: {
    layout: ReaderLayout
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
    // Split by ≥2 blank lines (allowing whitespace between newlines), tracking actual positions
    const separatorRegex = /\n[ \t]*\n[ \t]*\n?/g
    const rawChapters: { text: string; startInFull: number }[] = []
    let searchStart = 0
    let match: RegExpExecArray | null
    const starts: number[] = [0]

    while ((match = separatorRegex.exec(text)) !== null) {
      const chapterText = text.slice(searchStart, match.index)
      rawChapters.push({ text: chapterText, startInFull: searchStart })
      starts.push(match.index + match[0].length)
      searchStart = match.index + match[0].length
    }
    // Last chapter after final separator
    rawChapters.push({ text: text.slice(searchStart), startInFull: searchStart })

    // Filter out empty/whitespace-only chapters, preserving original positions
    this.chapters = []
    this.chapterOffsets = []
    let cumulativeOffset = 0
    for (const ch of rawChapters) {
      const trimmed = ch.text.trim()
      if (trimmed.length > 0) {
        this.chapterOffsets.push(cumulativeOffset)
        this.chapters.push(trimmed)
        cumulativeOffset += trimmed.length
      }
    }
    if (this.chapters.length === 0) {
      this.chapters = [text]
      this.chapterOffsets = [0]
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
    this.chapterIdx = 0
    this.charOffset = 0
    this.highlightIdMap.clear()
    this.highlightElements.clear()
  }

  async next(): Promise<void> {
    if (!this.container) return
    if (this.scrollByPage('next')) return
    if (this.chapterIdx < this.chapters.length - 1) {
      this.chapterIdx++
      this.charOffset = 0
    } else {
      return // at end
    }
    this.renderCurrentChapter()
  }

  async prev(): Promise<void> {
    if (!this.container) return
    if (this.scrollByPage('prev')) return
    if (this.chapterIdx > 0) {
      this.chapterIdx--
      this.charOffset = this.chapters[this.chapterIdx].length
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
    const visibleEnd = this.layout.flow === 'paginated'
      ? Math.min(this.chapters[this.chapterIdx]?.length ?? 0, this.charOffset + this.visibleCharsPerPage())
      : this.charOffset
    const charsRead = (this.chapterOffsets[this.chapterIdx] ?? 0) + visibleEnd
    const progress = Math.max(0, Math.min(100, Math.round((charsRead / totalChars) * 100)))
    return {
      format: 'txt',
      location: `${this.chapterIdx}:${this.charOffset}`,
      chapterIdx: this.chapterIdx,
      progress,
      chapterLabel: this.chapters[this.chapterIdx]?.replace(/\s+/g, ' ').trim().slice(0, 30) || `段落 ${this.chapterIdx + 1}`,
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
          chapterIdx: i,
          contextBefore: before,
          matchText: match,
          contextAfter: after,
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
    if (isNaN(chIdx) || chIdx < 0 || chIdx >= this.chapters.length) return ''
    // Always store so highlights survive chapter switches
    this.highlightIdMap.set(id, { chapterIdx: chIdx, start, end, color: spec.color })
    // Only paint DOM if this is the current chapter
    if (chIdx === this.chapterIdx) {
      this.applyHighlightInDom(id, start, end, spec.color)
    }
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
    for (const id of Array.from(this.highlightIdMap.keys())) {
      void this.removeHighlight(id)
    }
  }

  applyTheme(theme: ThemeMode): void {
    this.theme = theme
    if (!this.container) return
    this.injectThemeStyles(theme, null)
  }

  applyCustomThemeCSS(css: string): void {
    this.customThemeCss = css
    if (!this.container) return
    this.injectThemeStyles('custom', css)
  }

  applyLayout(layout?: ReaderLayout): void {
    if (layout) this.layout = { ...layout }
    if (!this.container) return
    const content = this.container.querySelector('[data-txt-content]') as HTMLElement | null
    if (!content) return
    const l = this.layout
    content.style.fontSize = `${l.fontSize}%`
    content.style.fontFamily = l.fontFamily
    content.style.fontWeight = String(l.fontWeight ?? 400)
    content.style.lineHeight = String(l.lineHeight)
    const horizontalPadding = l.flow === 'scrolled-doc'
      ? `max(${l.margin}px, calc((100% - 72ch) / 2))`
      : `${l.margin}px`
    content.style.padding = `24px ${horizontalPadding}`
    content.style.overflowY = l.flow === 'scrolled-doc' ? 'auto' : 'hidden'
    content.style.scrollbarWidth = l.flow === 'scrolled-doc' ? 'thin' : 'none'
    this.preparePaginationGeometry(content)
    this.restoreScrollPosition(content)
  }

  flow(mode: 'paginated' | 'scrolled-doc'): void {
    this.layout = { ...this.layout, flow: mode }
    this.applyLayout()
    this.injectThemeStyles(this.theme, null)
  }

  resize(): void {
    this.applyLayout()
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
        color: highlightColors[0],
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
    pre.setAttribute('data-reader-content', '')
    pre.setAttribute('data-txt-chapter', String(this.chapterIdx))
    pre.style.cssText = `
      white-space: pre-wrap;
      word-wrap: break-word;
      padding: 24px ${this.layout.flow === 'scrolled-doc' ? `max(${this.layout.margin}px, calc((100% - 72ch) / 2))` : `${this.layout.margin}px`};
      font-size: ${this.layout.fontSize}%;
      font-family: ${this.layout.fontFamily};
      font-weight: ${this.layout.fontWeight ?? 400};
      line-height: ${this.layout.lineHeight};
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      margin: 0;
      border: 0;
      overflow-y: ${this.layout.flow === 'scrolled-doc' ? 'auto' : 'hidden'};
      scrollbar-width: ${this.layout.flow === 'scrolled-doc' ? 'thin' : 'none'};
      scrollbar-color: rgba(90, 82, 70, 0.36) transparent;
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
    // Restore charOffset scroll position
    this.preparePaginationGeometry(pre)
    this.restoreScrollPosition(pre)
    // Track scroll position so syncRef can pick it up for progress saving
    pre.addEventListener('scroll', () => {
      this.updateCharOffsetFromScroll(pre)
    }, { passive: true })
  }

  private getContent(): HTMLElement | null {
    return this.container?.querySelector<HTMLElement>('[data-txt-content]') ?? null
  }

  private getLineHeight(content: HTMLElement): number {
    const computed = window.getComputedStyle(content)
    const lineHeight = parseFloat(computed.lineHeight)
    if (Number.isFinite(lineHeight) && lineHeight > 0) return lineHeight
    const fontSize = parseFloat(computed.fontSize) || 16
    return fontSize * this.layout.lineHeight
  }

  private preparePaginationGeometry(content: HTMLElement): void {
    if (this.layout.flow !== 'paginated') return
    content.style.paddingBottom = '24px'
    const lineHeight = this.getLineHeight(content)
    const maxScroll = Math.max(0, content.scrollHeight - content.clientHeight)
    const remainder = maxScroll % lineHeight
    const adjustment = remainder > 0.5 ? lineHeight - remainder : 0
    if (adjustment > 0.5) content.style.paddingBottom = `${24 + adjustment}px`
  }

  private restoreScrollPosition(content: HTMLElement): void {
    const chapterLength = this.chapters[this.chapterIdx]?.length ?? 0
    if (chapterLength <= 0 || this.charOffset <= 0) {
      content.scrollTop = 0
      return
    }
    const maxScroll = Math.max(0, content.scrollHeight - content.clientHeight)
    const target = (this.charOffset / chapterLength) * maxScroll
    content.scrollTop = this.layout.flow === 'paginated'
      ? alignPageScrollTop(target, maxScroll, this.getLineHeight(content))
      : Math.max(0, Math.min(maxScroll, target))
    this.updateCharOffsetFromScroll(content)
  }

  private updateCharOffsetFromScroll(content: HTMLElement): void {
    const chapterLength = this.chapters[this.chapterIdx]?.length ?? 0
    const maxScroll = Math.max(0, content.scrollHeight - content.clientHeight)
    if (chapterLength <= 0 || maxScroll <= 0) {
      this.charOffset = 0
      return
    }
    this.charOffset = Math.round((content.scrollTop / maxScroll) * chapterLength)
  }

  private scrollByPage(direction: 'next' | 'prev'): boolean {
    const content = this.getContent()
    if (!content) return false
    this.preparePaginationGeometry(content)
    const maxScroll = Math.max(0, content.scrollHeight - content.clientHeight)
    const currentTop = content.scrollTop
    if (direction === 'next' && currentTop >= maxScroll - 0.5) return false
    if (direction === 'prev' && currentTop <= 0.5) return false

    const computed = window.getComputedStyle(content)
    const lineHeight = this.getLineHeight(content)
    const pageStep = this.layout.flow === 'paginated'
      ? calculatePageScrollStep(
          content.clientHeight,
          parseFloat(computed.paddingTop) || 0,
          parseFloat(computed.paddingBottom) || 0,
          lineHeight,
        )
      : content.clientHeight
    const target = currentTop + (direction === 'next' ? pageStep : -pageStep)
    content.scrollTop = this.layout.flow === 'paginated'
      ? alignPageScrollTop(target, maxScroll, lineHeight)
      : Math.max(0, Math.min(maxScroll, target))
    this.updateCharOffsetFromScroll(content)
    return true
  }

  private applyHighlightInDom(id: string, start: number, end: number, color: string): void {
    if (!this.container) return
    const content = this.container.querySelector('[data-txt-content]')
    if (!content) return

    // Collect ALL highlights for this chapter (not just the one being added)
    const chapterHighlights: Array<{ id: string; start: number; end: number; color: string }> = []
    this.highlightIdMap.forEach((hl, hlId) => {
      if (hl.chapterIdx === this.chapterIdx) {
        chapterHighlights.push({ id: hlId, start: hl.start, end: hl.end, color: hl.color })
      }
    })

    if (chapterHighlights.length === 0) return

    const text = this.chapters[this.chapterIdx] || ''
    if (!text) return

    // Collect all boundary positions and sort them
    const boundaries = new Set<number>()
    boundaries.add(0)
    boundaries.add(text.length)
    for (const hl of chapterHighlights) {
      boundaries.add(hl.start)
      boundaries.add(hl.end)
    }
    const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b)

    // Build the chapter content: split at all highlight boundaries, wrap segments in <mark>
    const fragment = document.createDocumentFragment()
    const marksToRegister: HTMLElement[] = []

    for (let i = 0; i < sortedBoundaries.length - 1; i++) {
      const segStart = sortedBoundaries[i]
      const segEnd = sortedBoundaries[i + 1]
      const segText = text.slice(segStart, segEnd)
      if (!segText) continue

      // Find which highlight (if any) this segment falls into
      const enclosingHl = chapterHighlights.find(hl => segStart >= hl.start && segEnd <= hl.end)

      if (enclosingHl) {
        const mark = document.createElement('mark')
        mark.style.cssText = `background: ${enclosingHl.color}; color: inherit; padding: 0;`
        mark.textContent = segText
        fragment.appendChild(mark)
        marksToRegister.push(mark)
      } else {
        fragment.appendChild(document.createTextNode(segText))
      }
    }

    // Replace content, tracking marks by highlight id
    content.innerHTML = ''
    content.appendChild(fragment)

    // Update highlightElements for all highlights in this chapter
    for (const hl of chapterHighlights) {
      // Find all <mark> elements for this highlight by matching text content ranges
      const hlMarks: HTMLElement[] = []
      const hlStart = hl.start
      const hlEnd = hl.end
      for (const mark of content.querySelectorAll('mark')) {
        const markText = mark.textContent || ''
        const markContent = content.textContent || ''
        const markIndex = markContent.indexOf(markText)
        if (markIndex !== -1 && markIndex >= hlStart && markIndex + markText.length <= hlEnd) {
          hlMarks.push(mark)
        }
      }
      this.highlightElements.set(hl.id, hlMarks)
    }
  }

  private injectThemeStyles(theme: ThemeMode, customCss: string | null): void {
    if (!this.container) return
    const content = this.container.querySelector<HTMLElement>('[data-reader-content]')
    content?.classList.remove('light', 'sepia', 'dark', 'custom')
    content?.classList.add(theme)
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
    else if (theme === 'custom' && (customCss || this.customThemeCss)) css = customCss || this.customThemeCss || ''
    else if (theme === 'custom' && this.customTheme) css = generateCustomThemeCSS(this.customTheme)
    styleEl.textContent = `
      ${css}
      [data-txt-content]::-webkit-scrollbar {
        width: ${this.layout.flow === 'scrolled-doc' ? '8px' : '0'};
        height: ${this.layout.flow === 'scrolled-doc' ? '8px' : '0'};
      }
      [data-txt-content]::-webkit-scrollbar-track {
        background: transparent;
      }
      [data-txt-content]::-webkit-scrollbar-thumb {
        background: rgba(90, 82, 70, 0.32);
        border: 2px solid transparent;
        border-radius: 999px;
        background-clip: content-box;
      }
    `
  }

  private visibleCharsPerPage(): number {
    // DOM-based measurement: use actual rendered dimensions
    if (!this.container) return 1000
    const contentDiv = this.container.querySelector('[data-txt-content]') as HTMLElement | null
    if (!contentDiv) return 1000

    const containerHeight = this.container.clientHeight
    const scrollHeight = contentDiv.scrollHeight

    if (scrollHeight <= 0 || containerHeight <= 0) return 1000

    const chapterLength = this.chapters[this.chapterIdx]?.length || 0
    if (chapterLength === 0) return 1000

    // Visible fraction of chapter = clientHeight / scrollHeight
    // Visible chars = fraction * total chapter length
    const visibleFraction = containerHeight / scrollHeight
    return Math.round(visibleFraction * chapterLength)
  }
}
