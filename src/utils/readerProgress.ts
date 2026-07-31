export interface DisplayedPage {
  page?: number
  total?: number
}

export function calculateSectionProgress(
  sectionIndex: number,
  sectionCount: number,
  displayed?: DisplayedPage,
  atEnd = false,
): number {
  if (sectionCount <= 0) return 0
  const index = Math.max(0, Math.min(sectionCount - 1, sectionIndex))
  const totalPages = displayed?.total ?? 0
  const page = displayed?.page ?? 0
  const fraction = atEnd
    ? 1
    : totalPages > 0
      ? Math.max(0, Math.min(1, page / totalPages))
      : 0
  return Math.max(0, Math.min(100, Math.round(((index + fraction) / sectionCount) * 100)))
}

export function calculatePageScrollStep(
  viewportHeight: number,
  paddingTop: number,
  paddingBottom: number,
  lineHeight: number,
): number {
  if (viewportHeight <= 0 || lineHeight <= 0) return 0
  const usableHeight = Math.max(lineHeight, viewportHeight - paddingTop - paddingBottom)
  return Math.max(lineHeight, Math.floor(usableHeight / lineHeight) * lineHeight)
}

export function alignPageScrollTop(target: number, maxScroll: number, lineHeight: number): number {
  if (maxScroll <= 0 || lineHeight <= 0) return 0
  const boundedTarget = Math.max(0, Math.min(maxScroll, target))
  const alignedTarget = Math.round(boundedTarget / lineHeight) * lineHeight
  return Math.max(0, Math.min(maxScroll, alignedTarget))
}
