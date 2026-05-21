import { useEffect } from 'react'
import { loadAllBooks, loadAllProgress, loadCover, saveCover, loadReadingTime, loadWebDAVConfig, loadAIConfig, loadSetting, loadLastOpenedBook } from '../utils/db'
import type { BookEntry, BookMeta, WebDAVConfig, AIConfig } from '../types'

export function useInitialLoad(params: {
  onBooksLoaded: (entries: BookEntry[]) => void
  initReadingTime: (secs: number) => void
  setReadingTime: (secs: number) => void
  onWebDAVConfig: (config: WebDAVConfig | null) => void
  onAIConfig: (config: AIConfig | null) => void
  onAutoOpenBook?: (filePath: string) => void
}) {
  const { onBooksLoaded, initReadingTime, setReadingTime, onWebDAVConfig, onAIConfig, onAutoOpenBook } = params

  useEffect(() => {
    Promise.all([loadAllBooks(), loadAllProgress()]).then(([bookRecords, progressRecords]) => {
      const progressMap = new Map(progressRecords.map(p => [p.filePath, p]))
      const entries: BookEntry[] = bookRecords.map((r) => ({
        filePath: r.filePath,
        meta: { title: r.title, author: r.author, cover: (r as any).cover } as BookMeta,
        lastOpenedAt: r.lastOpenedAt,
        progress: progressMap.get(r.filePath)?.progress,
        chapterLabel: progressMap.get(r.filePath)?.chapterLabel,
      }))
      onBooksLoaded(entries)
      // 自动续读
      if (onAutoOpenBook) {
        Promise.all([loadSetting('startupBehavior'), loadLastOpenedBook()]).then(([behavior, lastBook]) => {
          if (behavior === 'resume' && lastBook) {
            onAutoOpenBook(lastBook.filePath)
          }
        })
      }
      // 迁移旧 base64 封面到 covers store
      Promise.all(bookRecords
        .filter((r: any) => r.cover && typeof r.cover === 'string')
        .map(async (r: any) => {
          const existing = await loadCover(r.filePath)
          if (existing) return
          const parts = r.cover.split(',')
          const mime = parts[0].split(':')[1]?.split(';')[0] || 'image/png'
          const binary = atob(parts[1])
          const buf = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
          await saveCover(r.filePath, buf.buffer, mime)
        })
      )
    }).catch((e) => console.warn('[useInitialLoad]', e))

    loadReadingTime(new Date().toISOString().slice(0, 10)).then((time) => {
      initReadingTime(time)
      setReadingTime(time)
    }).catch((e) => console.warn('[useInitialLoad]', e))

    loadWebDAVConfig().then(onWebDAVConfig).catch(() => {})
    loadAIConfig().then(onAIConfig).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
