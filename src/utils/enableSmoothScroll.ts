const DURATION = 300

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function animateScroll(
  container: HTMLElement,
  targetLeft: number,
  targetTop: number,
): Promise<void> {
  return new Promise((resolve) => {
    const startLeft = container.scrollLeft
    const startTop = container.scrollTop
    const deltaLeft = targetLeft - startLeft
    const deltaTop = targetTop - startTop
    const startTime = performance.now()

    function step(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / DURATION, 1)
      const eased = easeOutCubic(progress)

      container.scrollLeft = startLeft + deltaLeft * eased
      container.scrollTop = startTop + deltaTop * eased

      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        resolve()
      }
    }

    requestAnimationFrame(step)
  })
}

export function enableSmoothScroll(rendition: import('epubjs').Rendition) {
  if (!rendition?.manager) return

  const manager = rendition.manager
  const container = manager.container

  if (!container) return

  const originalNext = manager.next.bind(manager)
  const originalPrev = manager.prev.bind(manager)

  manager.next = async function () {
    const dir = this.settings.direction
    const isRtl = dir === 'rtl'

    if (!this.views.length) return

    if (this.isPaginated && this.settings.axis === 'horizontal' && (!dir || dir === 'ltr')) {
      const left = container.scrollLeft + container.offsetWidth + this.layout.delta
      if (left <= container.scrollWidth) {
        const targetLeft = container.scrollLeft + this.layout.delta
        await animateScroll(container, targetLeft, container.scrollTop)
        return
      } else {
        const next = this.views.last().section.next()
        if (next) return originalNext()
      }
    } else if (this.isPaginated && this.settings.axis === 'horizontal' && isRtl) {
      if (this.settings.rtlScrollType === 'default') {
        if (container.scrollLeft > 0) {
          const targetLeft = container.scrollLeft - this.layout.delta
          await animateScroll(container, targetLeft, container.scrollTop)
          return
        } else {
          const next = this.views.last().section.next()
          if (next) return originalNext()
        }
      } else {
        const left = container.scrollLeft + this.layout.delta * -1
        if (left > container.scrollWidth * -1) {
          const targetLeft = container.scrollLeft - this.layout.delta
          await animateScroll(container, targetLeft, container.scrollTop)
          return
        } else {
          const next = this.views.last().section.next()
          if (next) return originalNext()
        }
      }
    } else if (this.isPaginated && this.settings.axis === 'vertical') {
      const top = container.scrollTop + container.offsetHeight
      if (top < container.scrollHeight) {
        const targetTop = container.scrollTop + this.layout.height
        await animateScroll(container, container.scrollLeft, targetTop)
        return
      } else {
        const next = this.views.last().section.next()
        if (next) return originalNext()
      }
    }

    return originalNext()
  }

  manager.prev = async function () {
    const dir = this.settings.direction
    const isRtl = dir === 'rtl'

    if (!this.views.length) return

    if (this.isPaginated && this.settings.axis === 'horizontal' && (!dir || dir === 'ltr')) {
      if (container.scrollLeft > 0) {
        const targetLeft = container.scrollLeft - this.layout.delta
        await animateScroll(container, targetLeft, container.scrollTop)
        return
      } else {
        const prev = this.views.first().section.prev()
        if (prev) return originalPrev()
      }
    } else if (this.isPaginated && this.settings.axis === 'horizontal' && isRtl) {
      if (this.settings.rtlScrollType === 'default') {
        const left = container.scrollLeft
        if (left < container.scrollWidth) {
          const targetLeft = container.scrollLeft + this.layout.delta
          await animateScroll(container, targetLeft, container.scrollTop)
          return
        } else {
          const prev = this.views.first().section.prev()
          if (prev) return originalPrev()
        }
      } else {
        const left = container.scrollLeft + this.layout.delta
        if (left < 0) {
          const targetLeft = container.scrollLeft + this.layout.delta
          await animateScroll(container, targetLeft, container.scrollTop)
          return
        } else {
          const prev = this.views.first().section.prev()
          if (prev) return originalPrev()
        }
      }
    } else if (this.isPaginated && this.settings.axis === 'vertical') {
      if (container.scrollTop > 0) {
        const targetTop = container.scrollTop - this.layout.height
        await animateScroll(container, container.scrollLeft, targetTop)
        return
      } else {
        const prev = this.views.first().section.prev()
        if (prev) return originalPrev()
      }
    }

    return originalPrev()
  }
}