import { useState, useEffect } from 'react'

export type UiTheme = 'glass' | 'flat'

const STORAGE_KEY = 'coolreader-ui-theme'

function getInitialTheme(): UiTheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'glass' || stored === 'flat') {
      return stored
    }
  } catch {
    // localStorage not available
  }
  return 'glass'
}

// Module-level shared state so all useTheme() consumers stay in sync
let sharedTheme: UiTheme = getInitialTheme()
const listeners = new Set<React.Dispatch<React.SetStateAction<UiTheme>>>()

function notifyAll(t: UiTheme) {
  listeners.forEach((l) => l(t))
}

/**
 * Sets the ui-theme dataset attribute on <html> element,
 * updates shared state, and notifies all useTheme() consumers.
 */
export function setThemeOnRoot(theme: UiTheme): void {
  sharedTheme = theme
  document.documentElement.dataset.uiTheme = theme
  localStorage.setItem(STORAGE_KEY, theme)
  notifyAll(theme)
}

export function useTheme(): {
  theme: UiTheme
  setTheme: (t: UiTheme) => void
} {
  const [theme, setThemeState] = useState<UiTheme>(sharedTheme)

  useEffect(() => {
    listeners.add(setThemeState)
    // Sync with shared state on mount (handles race where theme changed before mount)
    setThemeState(sharedTheme)
    return () => {
      listeners.delete(setThemeState)
    }
  }, [])

  function setTheme(t: UiTheme): void {
    setThemeOnRoot(t)
  }

  return { theme, setTheme }
}