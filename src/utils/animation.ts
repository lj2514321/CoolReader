export type AnimationMode = 'fade' | 'slide' | 'blur-focus' | 'slide-fade'

const ANIMATION_CSS: Record<AnimationMode, string> = {
  fade: `
    @keyframes fadeIn { from { opacity: 0.5; } to { opacity: 1; } }
    .page-animate { animation: fadeIn 200ms ease-out forwards; }
  `,
  slide: `
    @keyframes slideInRight { from { transform: translateX(30px); opacity: 0.5; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideInLeft { from { transform: translateX(-30px); opacity: 0.5; } to { transform: translateX(0); opacity: 1; } }
    .page-animate-next { animation: slideInRight 200ms ease-out forwards; }
    .page-animate-prev { animation: slideInLeft 200ms ease-out forwards; }
  `,
  'blur-focus': `
    @keyframes blurFocus { from { filter: blur(4px); opacity: 0.5; } to { filter: blur(0); opacity: 1; } }
    .page-animate { animation: blurFocus 200ms ease-out forwards; }
  `,
  'slide-fade': `
    @keyframes slideFadeRight { from { transform: translateX(20px); opacity: 0.6; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideFadeLeft { from { transform: translateX(-20px); opacity: 0.6; } to { transform: translateX(0); opacity: 1; } }
    .page-animate-next { animation: slideFadeRight 180ms ease-out forwards; }
    .page-animate-prev { animation: slideFadeLeft 180ms ease-out forwards; }
  `,
}

const ANIMATION_DURATION: Record<AnimationMode, number> = {
  fade: 200,
  slide: 200,
  'blur-focus': 200,
  'slide-fade': 180,
}

function injectAnimationCss(doc: Document, mode: AnimationMode) {
  if (!doc?.head) return
  if (doc.getElementById('_page_animation')) return

  const style = doc.createElement('style')
  style.id = '_page_animation'
  style.textContent = ANIMATION_CSS[mode]
  doc.head.appendChild(style)
}

function getAnimationClass(direction: 'next' | 'prev', mode: AnimationMode): string {
  if (mode === 'slide' || mode === 'slide-fade') {
    return direction === 'next' ? 'page-animate-next' : 'page-animate-prev'
  }
  return 'page-animate'
}

function getAnimationDuration(mode: AnimationMode): number {
  return ANIMATION_DURATION[mode]
}

export function applyPageAnimation(
  rendition: import('epubjs').Rendition,
  direction: 'next' | 'prev',
  mode: AnimationMode,
  reducedMotion: boolean,
  onComplete?: () => void
) {
  const finalMode = reducedMotion ? 'fade' : mode

  const container = rendition?.manager?.container
  if (!container) {
    onComplete?.()
    return
  }

  const iframe = container.querySelector('iframe')
  if (!iframe?.contentDocument?.body) {
    onComplete?.()
    return
  }

  const doc = iframe.contentDocument
  injectAnimationCss(doc, finalMode)

  const animClass = getAnimationClass(direction, finalMode)
  const duration = getAnimationDuration(finalMode)

  doc.body.classList.remove('page-animate', 'page-animate-next', 'page-animate-prev')

  void doc.body.offsetWidth

  doc.body.classList.add(animClass)

  let completed = false
  const cleanup = () => {
    if (completed) return
    completed = true
    doc.body.classList.remove(animClass, 'page-animate', 'page-animate-next', 'page-animate-prev')
    onComplete?.()
  }

  const backupTimer = setTimeout(cleanup, duration + 50)

  const animationEndHandler = () => {
    clearTimeout(backupTimer)
    cleanup()
  }

  doc.body.addEventListener('animationend', animationEndHandler, { once: true })
}