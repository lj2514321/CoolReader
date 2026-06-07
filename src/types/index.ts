export interface BookMeta {
  title: string
  author: string
  cover?: string
  coverMime?: string
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
  format?: BookFormat
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

export type BookFormat = 'epub' | 'txt' | 'mobi'

export type AnimationMode = 'fade' | 'slide' | 'blur-focus' | 'slide-fade'

export interface ReaderLayout {
  fontSize: number
  fontFamily: string
  fontWeight?: number
  lineHeight: number
  margin: number
  flow: 'paginated' | 'scrolled-doc'
  animationMode?: AnimationMode
  reducedMotion?: boolean
  enableMediaKey?: boolean
}

export type ThemeMode = 'light' | 'dark' | 'sepia' | 'custom'

export type GradientType = 'linear' | 'radial'

export interface GradientStop {
  color: string
  position: number
}

export interface CustomTheme {
  type: 'solid' | 'gradient'
  color?: string
  gradientType?: GradientType
  gradientAngle?: number
  gradientStops?: GradientStop[]
  textColorDark?: string
  textColorLight?: string
}

export interface CustomPreset {
  label: string
  theme: CustomTheme
}

export type BgType = 'preset' | 'color' | 'gradient' | 'image'

export interface CustomBgConfig {
  type: BgType
  presetKey?: string
  color?: string
  gradient?: CustomTheme
  imageData?: string
  imageFit?: 'cover'
}

export const defaultCustomBg: CustomBgConfig = { type: 'preset', presetKey: 'deepPurple' }

export const presetGradients: { label: string; stops: GradientStop[]; angle: number; type: GradientType }[] = [
  { label: '碧海', stops: [{ color: 'rgba(59,130,246,0.85)', position: 0 }, { color: 'rgba(16,42,67,0.95)', position: 100 }], angle: 135, type: 'linear' },
  { label: '极光', stops: [{ color: 'rgba(34,197,94,0.8)', position: 0 }, { color: 'rgba(6,78,59,0.9)', position: 100 }], angle: 135, type: 'linear' },
  { label: '日出', stops: [{ color: 'rgba(255,183,77,0.9)', position: 0 }, { color: 'rgba(245,158,66,0.95)', position: 100 }], angle: 180, type: 'linear' },
  { label: '极光紫', stops: [{ color: 'rgba(167,139,250,0.85)', position: 0 }, { color: 'rgba(109,40,217,0.9)', position: 100 }], angle: 120, type: 'linear' },
  { label: '暗夜蓝', stops: [{ color: 'rgba(30,41,59,0.95)', position: 0 }, { color: 'rgba(15,23,42,0.98)', position: 100 }], angle: 0, type: 'radial' },
  { label: '晨雾', stops: [{ color: 'rgba(241,245,249,0.9)', position: 0 }, { color: 'rgba(226,232,240,0.85)', position: 100 }], angle: 135, type: 'linear' },
  { label: '森林', stops: [{ color: 'rgba(22,101,52,0.85)', position: 0 }, { color: 'rgba(5,46,22,0.95)', position: 100 }], angle: 135, type: 'linear' },
  { label: '玫瑰', stops: [{ color: 'rgba(244,114,182,0.85)', position: 0 }, { color: 'rgba(157,39,105,0.9)', position: 100 }], angle: 135, type: 'linear' },
]

export const defaultCustomTheme: CustomTheme = {
  type: 'solid',
  color: 'rgba(255,255,255,1)',
}

export const defaultLayout: ReaderLayout = {
  fontSize: 100,
  fontFamily: 'system-ui',
  fontWeight: 400,
  lineHeight: 1.6,
  margin: 20,
  flow: 'paginated',
  enableMediaKey: true,
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
  /** Universal position string. For epub: CFI. For txt/mobi: 'chapterIdx:charOffset' */
  location: string
  label: string
  createdAt: number
}

export interface Highlight {
  id?: number
  filePath: string
  /** @deprecated kept for backward compat with existing epub highlights */
  cfiRange: string
  /** Universal position string. For epub: CFI range. For txt/mobi: 'chapterIdx:startOffset-endOffset' */
  location: string
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

export interface ReadingGoal {
  dailyMinutes: number
}

export type Page = 'library' | 'reader'

export const themeStyles = {
  light: 'body.light, body.light * { background: #ffffff !important; color: #000000 !important; } body.light { background: #ffffff !important; }',
  dark: 'body.dark, body.dark * { background: #1a1a2e !important; color: #e0e0e0 !important; } body.dark { background: #1a1a2e !important; }',
  sepia: 'body.sepia, body.sepia * { background: #f5e6c8 !important; color: #5b4636 !important; } body.sepia { background: #f5e6c8 !important; }',
}
