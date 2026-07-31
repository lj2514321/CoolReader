export type AnimationMode = 'fade' | 'slide' | 'blur-focus' | 'slide-fade'

const ANIMATION_STYLE_ID = '_page_animation'
const ANIMATION_CLASSES = ['page-animate', 'page-animate-next', 'page-animate-prev'] as const

const ANIMATION_CSS = `
  @keyframes readerPageFadeIn { from { opacity: 0.5; } to { opacity: 1; } }
  @keyframes readerPageSlideInRight { from { transform: translateX(30px); opacity: 0.5; } to { transform: translateX(0); opacity: 1; } }
  @keyframes readerPageSlideInLeft { from { transform: translateX(-30px); opacity: 0.5; } to { transform: translateX(0); opacity: 1; } }
  @keyframes readerPageBlurFocus { from { filter: blur(4px); opacity: 0.5; } to { filter: blur(0); opacity: 1; } }
  @keyframes readerPageSlideFadeRight { from { transform: translateX(20px); opacity: 0.6; } to { transform: translateX(0); opacity: 1; } }
  @keyframes readerPageSlideFadeLeft { from { transform: translateX(-20px); opacity: 0.6; } to { transform: translateX(0); opacity: 1; } }

  .page-animate { animation: readerPageFadeIn 200ms ease-out forwards; }
  .page-animate-next { animation: readerPageSlideInRight 200ms ease-out forwards; }
  .page-animate-prev { animation: readerPageSlideInLeft 200ms ease-out forwards; }
  .page-animate-blur { animation: readerPageBlurFocus 200ms ease-out forwards; }
  .page-animate-slide-fade-next { animation: readerPageSlideFadeRight 180ms ease-out forwards; }
  .page-animate-slide-fade-prev { animation: readerPageSlideFadeLeft 180ms ease-out forwards; }
`

const ALL_ANIMATION_CLASSES = [
  ...ANIMATION_CLASSES,
  'page-animate-blur',
  'page-animate-slide-fade-next',
  'page-animate-slide-fade-prev',
] as const

const ANIMATION_DURATION: Record<AnimationMode, number> = {
  fade: 200,
  slide: 200,
  'blur-focus': 200,
  'slide-fade': 180,
}

interface RenditionManagerWithCurrent {
  container?: HTMLElement
  current?: () => { document?: Document } | null
}

interface AnimationTarget {
  element: HTMLElement
  scope: object
}

interface ActiveAnimation {
  cancel: () => void
}

const activeAnimations = new WeakMap<object, ActiveAnimation>()

function injectAnimationCss(doc: Document) {
  if (!doc?.head) return

  let style = doc.getElementById(ANIMATION_STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = doc.createElement('style')
    style.id = ANIMATION_STYLE_ID
    doc.head.appendChild(style)
  }

  // Refresh an existing style too, so changing modes after a hot reload cannot leave stale rules behind.
  if (style.textContent !== ANIMATION_CSS) style.textContent = ANIMATION_CSS
}

function getAnimationClass(direction: 'next' | 'prev', mode: AnimationMode): string {
  if (mode === 'slide') return direction === 'next' ? 'page-animate-next' : 'page-animate-prev'
  if (mode === 'slide-fade') {
    return direction === 'next' ? 'page-animate-slide-fade-next' : 'page-animate-slide-fade-prev'
  }
  if (mode === 'blur-focus') return 'page-animate-blur'
  return 'page-animate'
}

function normalizeAnimationMode(mode: AnimationMode): AnimationMode {
  return mode in ANIMATION_DURATION ? mode : 'slide'
}

function getDocumentBody(doc?: Document | null): HTMLElement | null {
  return doc?.body ?? null
}

function getLastIframeBody(container?: HTMLElement | null): HTMLElement | null {
  if (!container) return null
  const iframes = Array.from(container.querySelectorAll('iframe'))
  for (let i = iframes.length - 1; i >= 0; i--) {
    try {
      const body = getDocumentBody(iframes[i].contentDocument)
      if (body) return body
    } catch {
      // Ignore an inaccessible iframe and continue to the next rendered view.
    }
  }
  return null
}

function resolveAnimationTarget(rendition: import('epubjs').Rendition | null): AnimationTarget | null {
  if (rendition) {
    const manager = rendition.manager as RenditionManagerWithCurrent | undefined
    let currentBody: HTMLElement | null = null
    try {
      currentBody = getDocumentBody(manager?.current?.()?.document)
    } catch {
      // The manager can be between views at a chapter boundary; use its rendered iframe below.
    }
    const element = currentBody ?? getLastIframeBody(manager?.container)
    if (element) return { element, scope: rendition }
  }

  if (typeof document === 'undefined') return null
  const viewer = document.getElementById('viewer')
  if (!viewer) return null

  const txtContent = viewer.querySelector<HTMLElement>('[data-txt-content]')
  if (txtContent) return { element: txtContent, scope: viewer }

  const iframeBody = getLastIframeBody(viewer)
  return { element: iframeBody ?? viewer, scope: viewer }
}

export function applyPageAnimation(
  rendition: import('epubjs').Rendition | null,
  direction: 'next' | 'prev',
  mode: AnimationMode,
  reducedMotion: boolean,
  onComplete?: () => void
) {
  const target = resolveAnimationTarget(rendition)
  if (!target) {
    onComplete?.()
    return
  }

  // A rapid page turn supersedes the previous animation. Cancel its timer and listeners before
  // starting the next one so stale cleanup cannot remove the new animation class.
  activeAnimations.get(target.scope)?.cancel()

  const finalMode = reducedMotion ? 'fade' : normalizeAnimationMode(mode)
  const animClass = getAnimationClass(direction, finalMode)
  const duration = ANIMATION_DURATION[finalMode]
  const { element } = target
  const doc = element.ownerDocument
  injectAnimationCss(doc)

  let completed = false
  let backupTimer: ReturnType<typeof setTimeout> | undefined

  const cleanup = () => {
    if (completed) return
    completed = true
    if (backupTimer) clearTimeout(backupTimer)
    element.removeEventListener('animationend', handleAnimationEnd)
    element.removeEventListener('animationcancel', handleAnimationEnd)
    element.classList.remove(...ALL_ANIMATION_CLASSES)
    if (activeAnimations.get(target.scope) === activeAnimation) {
      activeAnimations.delete(target.scope)
    }
    onComplete?.()
  }

  const handleAnimationEnd = (event: Event) => {
    if (event.target === element) cleanup()
  }

  const activeAnimation: ActiveAnimation = { cancel: cleanup }
  activeAnimations.set(target.scope, activeAnimation)

  element.classList.remove(...ALL_ANIMATION_CLASSES)
  element.addEventListener('animationend', handleAnimationEnd)
  element.addEventListener('animationcancel', handleAnimationEnd)
  void element.offsetWidth
  element.classList.add(animClass)
  backupTimer = setTimeout(cleanup, duration + 50)
}
