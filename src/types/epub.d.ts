// epub.js type patches — addresses 14 TS errors in useBookEngine.ts, useReaderControls.ts, useSearch.ts
// These augment the bundled epubjs type definitions with APIs that are used at runtime but missing from @types/epubjs

declare module 'epubjs' {
  interface View {
    section: {
      next(): Section | null
      prev(): Section | null
      href?: string
      index?: number
    }
    document?: {
      body: HTMLElement
    }
  }

  interface Manager {
    container: HTMLElement
    settings: {
      direction?: string
      axis?: string
      isPaginated?: boolean
      rtlScrollType?: string
    }
    isPaginated: boolean
    layout: {
      delta: number
      height: number
      width?: number
    }
    views: {
      length: number
      last(): View
      first(): View
      [index: number]: View
    }
    next(): void | Promise<void>
    prev(): void | Promise<void>
    display(section: string | Section, target?: string | number): Promise<void>
  }

  interface Section {
    next(): Section | null
    prev(): Section | null
    href?: string
    index?: number
    label?: string
    subitems?: Section[]
  }

  interface Spine {
    get(href: string): Section | null
    get(index: number): Section | null
    items: unknown[]
    length: number
  }

  interface Book {
    spine: Spine
    archive: {
      getText(url: string): Promise<string>
    }
    packaging?: {
      metadata?: {
        title?: string
      }
    }
    destroy(): void
  }

  interface Annotations {
    highlight(cfiRange: string, data?: object, cb?: Function, className?: string, styles?: object): void
    remove(cfiRange: string, type: string): void
  }

  interface Rendition {
    display(cfi: string): Promise<void>
    display(index: number): Promise<void>
    display(href: string): Promise<void>
    next(): Promise<void>
    prev(): Promise<void>
    resize(): void
    flow(flow: string): void
    themes: {
      select(theme: string): void
      registerCss(css: string): void
    }
    annotations?: Annotations
    destroy(): void
    manager?: Manager
    getCfiFromRange(range: Range): string
  }

  export default function ePub(input: string | ArrayBuffer): Book
  export { Book, Rendition }
}

declare module 'epubjs/types/navigation' {
  export interface NavItem {
    id: string
    href: string
    label: string
    subitems?: NavItem[]
    parent?: string
  }
}
