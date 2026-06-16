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

  // Declaration merge: extend Spine.items element type for href access
  interface Spine {
    items: Array<{ href?: string; index?: number }>
  }

  interface Book {
    spine: Spine
    archive: {
      getText(url: string): Promise<string>
    }
    packaging?: {
      metadata?: {
        title?: string
        creator?: string
      }
    }
    // v1.5.3 extensions for EpubAdapter / useBookEngine
    readonly ready: Promise<void>
    readonly loaded: {
      navigation: Promise<{
        toc: Array<{
          id: string
          href: string
          label: string
          subitems?: NavItem[]
          parent?: string
        }>
      }>
    }
    renderTo(target: HTMLElement | string, options?: {
      width?: string | number
      height?: string | number
      spread?: string
      allowScriptedContent?: boolean
      flow?: string
    }): Rendition
    coverUrl(): Promise<string | null>
    search(query: string): Promise<Array<{ cfi?: string; excerpt?: string }>>
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
      registerCss(name: string, css?: string): void
    }
    annotations?: Annotations
    destroy(): void
    manager?: Manager
    getCfiFromRange(range: Range): string
    on(event: string, handler: (...args: unknown[]) => void): void
    // v1.5.3 extensions
    readonly currentLocation: () => {
      start?: {
        cfi: string
        index: number
        href?: string
      }
    } | undefined
    readonly hooks: {
      content: {
        register(cb: (view: View) => void): void
      }
    }
  }

  // Declaration merge: extend Rendition with spine href access
  interface Rendition {
    themes: {
      select(theme: string): void
      registerCss(css: string): void
      registerCss(name: string, css?: string): void
    }
  }

  export default function ePub(input: string | ArrayBuffer): Book
  export { Book, Rendition }
  // Re-export View from submodule so EpubAdapter import works
  export type { View } from 'epubjs/types/managers/view'
}

declare module 'epubjs/types/navigation' {
  export interface NavItem {
    id: string
    href: string
    label: string
    subitems?: NavItem[]
    parent?: string
  }
  // Alias for backward compat with code using EpubNavItem
  export type EpubNavItem = NavItem
}
