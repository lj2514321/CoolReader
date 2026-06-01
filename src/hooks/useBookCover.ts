import { useState, useEffect } from 'react'
import { loadCover } from '../utils/db'

export function useBookCover(filePath: string, fallbackMime?: string) {
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined)

  useEffect(() => {
    let active = true
    let url: string | undefined

    loadCover(filePath).then(record => {
      if (!active || !record) return
      const blob = new Blob([record.data], { type: record.mime ?? fallbackMime ?? 'image/png' })
      url = URL.createObjectURL(blob)
      setCoverUrl(url)
    })

    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [filePath, fallbackMime])

  return coverUrl
}