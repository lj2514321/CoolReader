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

export const themeStyles: Record<ThemeMode, Record<string, Record<string, string>>> = {
  light: { body: { background: '#ffffff', color: '#000000' } },
  dark: { body: { background: '#1a1a2e', color: '#e0e0e0' } },
  sepia: { body: { background: '#f5e6c8', color: '#5b4636' } },
}
