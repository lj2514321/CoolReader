import type { ElectronAPI } from '../types/electron'

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export function getElectronAPI(): ElectronAPI | undefined {
  return window.electronAPI
}

export function requireElectronAPI(): ElectronAPI {
  const api = window.electronAPI
  if (!api) {
    throw new Error('electronAPI not available — not running in Electron')
  }
  return api
}