import { useEffect } from 'react'
import { loadAllBooks, loadAllProgress, loadCover, saveCover, loadReadingTime, loadWebDAVConfig, loadAIConfig, loadSetting, loadLastOpenedBook } from '../utils/db'
import type { BookEntry, BookMeta, WebDAVConfig, AIConfig } from '../types'

// Extended type for DB records that may have legacy base64 cover stored directly on the record
interface BookRecord {
  filePath: string
  title: string
  author: string
  cover?: string
  lastOpenedAt?: number
}

export function useInitialLoad(params: {
  onBooksLoaded: (entries: BookEntry[]) => void
  initReadingTime: (secs: number) => void
  setReadingTime: (secs: number) => void
  onWebDAVConfig: (config: WebDAVConfig | null) => void
  onAIConfig: (config: AIConfig | null) => void
  onAutoOpenBook?: (filePath: string) => void
  onLoadingMessage?: (message: string) => void
  onLoaded?: () => void
}) {
  const { onBooksLoaded, initReadingTime, setReadingTime, onWebDAVConfig, onAIConfig, onAutoOpenBook, onLoadingMessage, onLoaded } = params

  useEffect(() => {
    let cancelled = false
    const setMessage = (message: string) => {
      if (!cancelled) onLoadingMessage?.(message)
    }

    const load = async () => {
      try {
        setMessage('正在加载书架…')
        const [bookRecords, progressRecords] = await Promise.all([loadAllBooks(), loadAllProgress()])
        if (cancelled) return

        const progressMap = new Map(progressRecords.map(p => [p.filePath, p]))
        const entries: BookEntry[] = bookRecords.map((r) => ({
          filePath: r.filePath,
          meta: { title: r.title, author: r.author, cover: (r as BookRecord).cover } as BookMeta,
          lastOpenedAt: r.lastOpenedAt,
          progress: progressMap.get(r.filePath)?.progress,
          chapterLabel: progressMap.get(r.filePath)?.chapterLabel,
        }))
        onBooksLoaded(entries)

        const today = new Date().toISOString().slice(0, 10)
        const [, webdavConfig, aiConfig] = await Promise.all([
          loadReadingTime(today)
            .then((t) => { initReadingTime(t); setReadingTime(t) })
            .catch((e) => { console.warn('[useInitialLoad]', e) }),
          loadWebDAVConfig().then(onWebDAVConfig).catch(() => onWebDAVConfig(null)),
          loadAIConfig().then(onAIConfig).catch(() => onAIConfig(null)),
        ])
        if (cancelled) return

        onLoaded?.()

        if (onAutoOpenBook) {
          Promise.all([loadSetting('startupBehavior'), loadLastOpenedBook()]).then(([behavior, lastBook]) => {
            if (!cancelled && behavior === 'resume' && lastBook) {
              onAutoOpenBook(lastBook.filePath)
            }
          }).catch((e) => console.warn('[useInitialLoad]', e))
        }

        const booksWithCover = bookRecords.filter((r: BookRecord) => r.cover && typeof r.cover === 'string')
        Promise.all(booksWithCover
          .map(async (r: BookRecord) => {
            const existing = await loadCover(r.filePath)
            if (existing) return
            const parts = (r.cover as string).split(',')
            const mime = parts[0].split(':')[1]?.split(';')[0] || 'image/png'
            const binary = atob(parts[1])
            const buf = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
            await saveCover(r.filePath, buf.buffer, mime)
          })
        ).catch((e) => console.warn('[useInitialLoad]', e))
      } catch (e) {
        console.warn('[useInitialLoad]', e)
        if (!cancelled) onLoaded?.()
      }
    }

    load()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
