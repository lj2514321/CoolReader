import { useState, useCallback, useEffect } from 'react'
import type { Page } from '../types'
import { isSupportedFile } from '../utils/formatDetection'

export function useDragDrop(page: Page, doImport: (path: string) => Promise<void> | void) {
  const [isDragging, setIsDragging] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (page !== 'library') return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragging(true)
  }, [page])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (page !== 'library') return
    const file = e.dataTransfer.files[0]
    if (!file) return
    // T7: accept epub/txt/mobi/azw3/prc
    if (!isSupportedFile(file.name)) {
      setToast(`不支持的文件格式: ${file.name}，仅支持 EPUB/TXT/MOBI 文件`)
      return
    }
    const filePath = file.path
    if (!filePath) return
    doImport(filePath)
  }, [page, doImport])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  return { isDragging, toast, handleDragOver, handleDragLeave, handleDrop }
}
