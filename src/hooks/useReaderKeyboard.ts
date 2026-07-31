import { Dispatch, SetStateAction, useEffect } from 'react'
import { ReaderLayout } from '../types'
import { getElectronAPI } from '../utils/electronAPI'
import { READER_CONTENT_KEY_EVENT, ReaderContentKeyDetail } from '../utils/readerContentEvents'

type BooleanSetter = Dispatch<SetStateAction<boolean>>

export function useReaderKeyboard(
  nextRef: React.MutableRefObject<() => void>,
  prevRef: React.MutableRefObject<() => void>,
  bookmarkRef: React.MutableRefObject<() => void>,
  showSearchRef: React.MutableRefObject<boolean>,
  showLayoutRef: React.MutableRefObject<boolean>,
  showMarkersRef: React.MutableRefObject<boolean>,
  showAIRef: React.MutableRefObject<boolean>,
  showMoreRef: React.MutableRefObject<boolean>,
  setShowSearch: BooleanSetter,
  setShowLayout: BooleanSetter,
  setShowMarkers: BooleanSetter,
  setShowAI: BooleanSetter,
  setShowMore: BooleanSetter,
  showControls: () => void,
  layout: ReaderLayout,
  flowRef: React.MutableRefObject<string>
) {
  useEffect(() => {
    const handleKey = (e: Pick<KeyboardEvent, 'key' | 'code' | 'shiftKey' | 'ctrlKey' | 'metaKey'>, target?: EventTarget | null) => {
      const tag = target instanceof HTMLElement ? target.tagName : ''
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowRight' || (e.key === ' ' && flowRef.current === 'paginated' && !e.shiftKey)) { nextRef.current(); showControls(); return true }
      if (e.key === 'ArrowLeft' || (e.key === ' ' && flowRef.current === 'paginated' && e.shiftKey)) { prevRef.current(); showControls(); return true }
      if ((e.code === 'MediaNextTrack' || e.key === 'MediaNextTrack') && layout.enableMediaKey) { nextRef.current(); showControls(); return true }
      if ((e.code === 'MediaPreviousTrack' || e.key === 'MediaPreviousTrack') && layout.enableMediaKey) { prevRef.current(); showControls(); return true }
      if (e.key === 'Escape') {
        if (showSearchRef.current) setShowSearch(false)
        else if (showLayoutRef.current) setShowLayout(false)
        else if (showMarkersRef.current) setShowMarkers(false)
        else if (showAIRef.current) setShowAI(false)
        else if (showMoreRef.current) setShowMore(false)
        showControls(); return true
      }
      if ((e.key === 'f' || e.key === 'F') && (e.ctrlKey || e.metaKey)) {
        setShowSearch(v => !v)
        setShowLayout(false)
        setShowMarkers(false)
        setShowAI(false)
        setShowMore(false)
        showControls()
        return true
      }
      if ((e.key === 'b' || e.key === 'B') && !e.ctrlKey && !e.metaKey) { bookmarkRef.current(); showControls(); return true }
      if (e.key === 'F11') { getElectronAPI()?.toggleFullscreen(); return true }
      return false
    }

    const handler = (e: KeyboardEvent) => {
      if (handleKey(e, e.target)) e.preventDefault()
    }
    const contentHandler = (event: Event) => {
      const e = event as CustomEvent<ReaderContentKeyDetail>
      if (handleKey(e.detail)) e.preventDefault()
    }
    window.addEventListener('keydown', handler)
    window.addEventListener(READER_CONTENT_KEY_EVENT, contentHandler)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener(READER_CONTENT_KEY_EVENT, contentHandler)
    }
  }, [nextRef, prevRef, bookmarkRef, showSearchRef, showLayoutRef, showMarkersRef, showAIRef, showMoreRef, setShowSearch, setShowLayout, setShowMarkers, setShowAI, setShowMore, showControls, layout, flowRef])
}
