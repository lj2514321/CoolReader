export const READER_CONTENT_CLICK_EVENT = 'coolreader:content-click'
export const READER_CONTENT_KEY_EVENT = 'coolreader:content-key'

export interface ReaderContentClickDetail {
  x: number
  width: number
}

export interface ReaderContentKeyDetail {
  key: string
  code: string
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}

const cleanupByDocument = new WeakMap<Document, () => void>()

function isInteractiveTarget(target: EventTarget | null): boolean {
  const element = target as Element | null
  return typeof element?.closest === 'function' && !!element.closest('a, button, input, textarea, select, [contenteditable="true"]')
}

export function getReaderRelativeBounds(doc: Document, rect: DOMRect) {
  const viewer = document.getElementById('viewer')
  const viewerRect = viewer?.getBoundingClientRect()
  const frame = doc.defaultView?.frameElement as HTMLElement | null
  const frameRect = frame?.getBoundingClientRect()

  return {
    top: rect.top + (frameRect?.top ?? 0) - (viewerRect?.top ?? 0),
    left: rect.left + (frameRect?.left ?? 0) - (viewerRect?.left ?? 0),
    width: rect.width,
    height: rect.height,
  }
}

export function bindReaderDocumentEvents(doc: Document): () => void {
  cleanupByDocument.get(doc)?.()

  const handleClick = (event: MouseEvent) => {
    if (event.button !== 0 || event.defaultPrevented || isInteractiveTarget(event.target)) return
    const selection = doc.getSelection()
    if (selection && !selection.isCollapsed) return

    const viewer = document.getElementById('viewer')
    if (!viewer) return
    const viewerRect = viewer.getBoundingClientRect()
    const frame = doc.defaultView?.frameElement as HTMLElement | null
    const frameRect = frame?.getBoundingClientRect()
    const x = event.clientX + (frameRect?.left ?? 0) - viewerRect.left

    window.dispatchEvent(new CustomEvent<ReaderContentClickDetail>(READER_CONTENT_CLICK_EVENT, {
      detail: { x, width: viewerRect.width },
    }))
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (isInteractiveTarget(event.target)) return
    const forwarded = new CustomEvent<ReaderContentKeyDetail>(READER_CONTENT_KEY_EVENT, {
      cancelable: true,
      detail: {
        key: event.key,
        code: event.code,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
      },
    })
    window.dispatchEvent(forwarded)
    if (forwarded.defaultPrevented) event.preventDefault()
  }

  doc.addEventListener('click', handleClick)
  doc.addEventListener('keydown', handleKeyDown)

  const cleanup = () => {
    doc.removeEventListener('click', handleClick)
    doc.removeEventListener('keydown', handleKeyDown)
    if (cleanupByDocument.get(doc) === cleanup) cleanupByDocument.delete(doc)
  }
  cleanupByDocument.set(doc, cleanup)
  return cleanup
}

export function unbindReaderDocumentEvents(doc: Document | null | undefined) {
  if (doc) cleanupByDocument.get(doc)?.()
}
