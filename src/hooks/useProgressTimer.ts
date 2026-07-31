import { useEffect, useRef } from 'react'
import { saveProgress } from '../utils/db'
import type { Page } from '../types'

export function useProgressTimer(params: {
  currentBook: string | null
  page: Page
  indexRef: React.MutableRefObject<number>
  cfiRef: React.MutableRefObject<string>
  progressRef: React.MutableRefObject<number>
  getChapterLabel: (idx: number) => string
  saveReadingTime: () => Promise<void>
  saveBookReadingTime: () => Promise<void>
  getReadingSeconds: () => number
  setReadingTime: (secs: number) => void
}) {
  const { currentBook, page, indexRef, cfiRef, progressRef, getChapterLabel, saveReadingTime, saveBookReadingTime, getReadingSeconds, setReadingTime } = params

  const lastSavedIdxRef = useRef(-1)
  const lastSavedCfiRef = useRef('')
  const pageRef = useRef(page)
  pageRef.current = page

  useEffect(() => {
    if (!currentBook) return
    const progressTimer = setInterval(() => {
      const idx = indexRef.current
      const cfi = cfiRef.current
      if (cfi && (idx !== lastSavedIdxRef.current || cfi !== lastSavedCfiRef.current)) {
        lastSavedIdxRef.current = idx
        lastSavedCfiRef.current = cfi
        saveProgress(currentBook, progressRef.current, cfi, idx, getChapterLabel(idx))
      }
      if (pageRef.current === 'library') setReadingTime(getReadingSeconds())
    }, 2000)

    const readingTimer = setInterval(() => {
      if (pageRef.current === 'reader') {
        void saveReadingTime()
        void saveBookReadingTime()
      }
    }, 15000)

    return () => { clearInterval(progressTimer); clearInterval(readingTimer) }
  }, [currentBook, getChapterLabel, saveReadingTime, saveBookReadingTime, getReadingSeconds, setReadingTime, indexRef, cfiRef, progressRef])
}
