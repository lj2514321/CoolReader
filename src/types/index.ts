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
}

export type ThemeMode = 'light' | 'dark' | 'sepia'

export const themeStyles: Record<ThemeMode, string> = {
  light: 'body.light { background: #ffffff !important; color: #000000 !important; }',
  dark: 'body.dark { background: #1a1a2e !important; color: #e0e0e0 !important; }',
  sepia: 'body.sepia { background: #f5e6c8 !important; color: #5b4636 !important; }',
}
