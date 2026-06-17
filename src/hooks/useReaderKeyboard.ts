import { useEffect } from 'react'
import { ReaderLayout } from '../types'
import { getElectronAPI } from '../utils/electronAPI'

export function useReaderKeyboard(
  nextRef: React.MutableRefObject<() => void>,
  prevRef: React.MutableRefObject<() => void>,
  bookmarkRef: React.MutableRefObject<() => void>,
  showSearchRef: React.MutableRefObject<boolean>,
  showLayoutRef: React.MutableRefObject<boolean>,
  showMarkersRef: React.MutableRefObject<boolean>,
  showAIRef: React.MutableRefObject<boolean>,
  setShowSearch: (v: boolean) => void,
  setShowLayout: (v: boolean) => void,
  setShowMarkers: (v: boolean) => void,
  setShowAI: (v: boolean) => void,
  closeTopPanel: () => void,
  showControls: () => void,
  layout: ReaderLayout,
  flowRef: React.MutableRefObject<string>
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowRight' || (e.key === ' ' && flowRef.current === 'paginated' && !e.shiftKey)) { e.preventDefault(); nextRef.current(); return }
      if (e.key === 'ArrowLeft' || (e.key === ' ' && e.shiftKey)) { e.preventDefault(); prevRef.current(); return }
      if ((e.code === 'MediaNextTrack' || e.key === 'MediaNextTrack') && layout.enableMediaKey) { e.preventDefault(); nextRef.current(); return }
      if ((e.code === 'MediaPreviousTrack' || e.key === 'MediaPreviousTrack') && layout.enableMediaKey) { e.preventDefault(); prevRef.current(); return }
      if (e.key === 'Escape') {
        if (showSearchRef.current) setShowSearch(false)
        else if (showLayoutRef.current) setShowLayout(false)
        else if (showMarkersRef.current) setShowMarkers(false)
        else if (showAIRef.current) setShowAI(false)
        showControls(); return
      }
      if ((e.key === 'f' || e.key === 'F') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setShowSearch(v => !v); showControls(); return }
      if ((e.key === 'b' || e.key === 'B') && !e.ctrlKey && !e.metaKey) { bookmarkRef.current(); showControls(); return }
      if (e.key === 'F11') { e.preventDefault(); getElectronAPI()?.toggleFullscreen() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [nextRef, prevRef, bookmarkRef, showSearchRef, showLayoutRef, showMarkersRef, showAIRef, setShowSearch, setShowLayout, setShowMarkers, setShowAI, closeTopPanel, showControls, layout, flowRef])
}