export interface BookMeta {
  title: string
  author: string
  cover?: string
}

export interface NavItem {
  label: string
  href: string
  subitems?: NavItem[]
}

export interface BookEntry {
  filePath: string
  meta: BookMeta
  lastOpenedAt?: number
  progress?: number
  chapterLabel?: string
}

export interface WebDAVConfig {
  url: string
  username: string
  password: string
  path: string  // e.g. '/CoolReader'
}

export interface SyncResult {
  success: boolean
  uploaded: number
  downloaded: number
  conflicts: number
  errors: string[]
}

export interface SyncProgressEvent {
  phase: 'connect' | 'list' | 'upload' | 'download' | 'progress' | 'readingTime' | 'done'
  message: string
  current?: number
  total?: number
}

export interface AIConfig {
  apiUrl: string
  apiKey: string
  model: string
}

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ReaderLayout {
  fontSize: number
  fontFamily: string
  lineHeight: number
  margin: number
}

export type ThemeMode = 'light' | 'dark' | 'sepia'

export const defaultLayout: ReaderLayout = {
  fontSize: 100,
  fontFamily: 'system-ui',
  lineHeight: 1.6,
  margin: 20,
}

export const fontFamilies = [
  { label: '系统默认', value: 'system-ui' },
  { label: '宋体', value: '"Noto Serif SC", "SimSun", serif' },
  { label: '黑体', value: '"Noto Sans SC", "SimHei", sans-serif' },
  { label: '楷体', value: '"KaiTi", "STKaiti", serif' },
  { label: '衬线', value: 'Georgia, "Times New Roman", serif' },
  { label: '无衬线', value: '"Helvetica Neue", Arial, sans-serif' },
  { label: '等宽', value: '"Cascadia Code", "Fira Code", monospace' },
]

export interface Bookmark {
  id?: number
  filePath: string
  cfi: string
  label: string
  createdAt: number
}

export interface Highlight {
  id?: number
  filePath: string
  cfiRange: string
  text: string
  note?: string
  color: string
  createdAt: number
}

export const highlightColors = ['#ffeb3b', '#4caf50', '#2196f3', '#e91e63'] as const

export interface SearchResult {
  chapterIndex: number
  chapterHref: string
  chapterLabel: string
  matchIndex: number
  contextBefore: string
  matchText: string
  contextAfter: string
}

export const themeStyles: Record<ThemeMode, string> = {
  light: 'body.light { background: #ffffff !important; color: #000000 !important; }',
  dark: 'body.dark { background: #1a1a2e !important; color: #e0e0e0 !important; }',
  sepia: 'body.sepia { background: #f5e6c8 !important; color: #5b4636 !important; }',
}
