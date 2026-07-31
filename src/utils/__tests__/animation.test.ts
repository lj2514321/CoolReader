import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyPageAnimation } from '../animation'

function makeAnimationDocument() {
  const classes = new Set<string>()
  const listeners = new Map<string, Set<(event: Event) => void>>()
  const styles = new Map<string, { id: string; textContent: string }>()

  const doc = {
    head: {
      appendChild(style: { id: string; textContent: string }) {
        styles.set(style.id, style)
      },
    },
    body: null as unknown as HTMLElement,
    getElementById(id: string) {
      return styles.get(id) ?? null
    },
    createElement() {
      return { id: '', textContent: '' }
    },
  } as unknown as Document

  const body = {
    ownerDocument: doc,
    offsetWidth: 800,
    classList: {
      add(...names: string[]) { names.forEach(name => classes.add(name)) },
      remove(...names: string[]) { names.forEach(name => classes.delete(name)) },
    },
    addEventListener(type: string, listener: (event: Event) => void) {
      const handlers = listeners.get(type) ?? new Set()
      handlers.add(listener)
      listeners.set(type, handlers)
    },
    removeEventListener(type: string, listener: (event: Event) => void) {
      listeners.get(type)?.delete(listener)
    },
  } as unknown as HTMLElement

  ;(doc as { body: HTMLElement }).body = body
  const rendition = {
    manager: {
      current: () => ({ document: doc }),
    },
  } as unknown as import('epubjs').Rendition

  return { classes, doc, rendition, styles }
}

describe('applyPageAnimation', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps all animation modes available after the first style injection', () => {
    vi.useFakeTimers()
    const { classes, rendition, styles } = makeAnimationDocument()

    applyPageAnimation(rendition, 'next', 'fade', false)
    expect(classes.has('page-animate')).toBe(true)

    applyPageAnimation(rendition, 'prev', 'slide-fade', false)
    expect(classes.has('page-animate')).toBe(false)
    expect(classes.has('page-animate-slide-fade-prev')).toBe(true)
    expect(styles.get('_page_animation')?.textContent).toContain('readerPageSlideFadeLeft')
  })

  it('prevents an old cleanup timer from stopping a newer animation', () => {
    vi.useFakeTimers()
    const { classes, rendition } = makeAnimationDocument()
    const firstComplete = vi.fn()
    const secondComplete = vi.fn()

    applyPageAnimation(rendition, 'next', 'slide', false, firstComplete)
    vi.advanceTimersByTime(100)
    applyPageAnimation(rendition, 'next', 'slide', false, secondComplete)

    expect(firstComplete).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(151)
    expect(classes.has('page-animate-next')).toBe(true)
    expect(secondComplete).not.toHaveBeenCalled()

    vi.advanceTimersByTime(99)
    expect(classes.has('page-animate-next')).toBe(false)
    expect(secondComplete).toHaveBeenCalledOnce()
  })
})
