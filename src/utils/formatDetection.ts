import type { BookFormat } from '../types'

const SUPPORTED_EXTENSIONS = ['epub', 'txt', 'mobi', 'azw3', 'prc'] as const

/**
 * Detects the ebook format from a file path based on its extension.
 * Throws an error for unsupported formats — caller should validate with isSupportedFile first.
 */
export function getFormatFromPath(filePath: string): BookFormat {
  const ext = filePath.toLowerCase().split('.').pop() || ''
  if (ext === 'epub') return 'epub'
  if (ext === 'txt') return 'txt'
  if (ext === 'mobi' || ext === 'azw3' || ext === 'prc') return 'mobi'
  throw new Error(`Unsupported ebook format: .${ext}`)
}

/**
 * Returns true if the file (by name) has a supported ebook extension.
 * Use this to validate before importing.
 */
export function isSupportedFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop() || ''
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)
}

/**
 * Returns the list of file extensions accepted by the file dialog.
 */
export function getSupportedExtensions(): string[] {
  return [...SUPPORTED_EXTENSIONS]
}
