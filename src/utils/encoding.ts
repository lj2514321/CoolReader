import iconv from 'iconv-lite'

/**
 * Detects encoding from a Buffer/Uint8Array.
 * Uses chardet's analyse algorithm — runs in main process (Node) only.
 * Returns the encoding name compatible with iconv-lite.
 */
export function detectEncoding(buffer: Uint8Array | Buffer): string {
  // chardet only exists in main process; lazy import to avoid bundling into renderer
  // For renderer-side usage, encoding detection must happen in main process via IPC
  try {
    // Dynamic require to avoid bundling chardet into renderer
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const chardet = require('chardet')
    const detected = chardet.analyse(Buffer.from(buffer))
    if (Array.isArray(detected) && detected.length > 0) {
      // chardet returns array sorted by confidence; take the highest
      const encoding = detected[0].name
      return normalizeEncoding(encoding)
    }
  } catch {
    // chardet not available (renderer context) — fall through
  }
  return 'UTF-8'
}

/**
 * Decodes a buffer using the given encoding into a UTF-8 string.
 * Supports common encodings via iconv-lite (GBK, GB18030, UTF-8, UTF-16 LE/BE, etc.)
 */
export function decodeBuffer(buffer: Uint8Array | Buffer, encoding: string): string {
  const enc = normalizeEncoding(encoding)
  if (enc === 'UTF-8' || enc === 'utf-8') {
    return new TextDecoder('utf-8').decode(buffer)
  }
  try {
    return iconv.decode(Buffer.from(buffer), enc)
  } catch (e) {
    // Fallback: try as UTF-8
    return new TextDecoder('utf-8').decode(buffer)
  }
}

/**
 * Maps chardet encoding names to iconv-lite compatible names.
 * chardet may return 'GB2312' but iconv-lite uses 'GBK'/'GB18030'.
 */
function normalizeEncoding(encoding: string): string {
  const upper = encoding.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (upper === 'UTF8') return 'UTF-8'
  if (upper === 'UTF16LE' || upper === 'UTF16LE') return 'UTF-16 LE'
  if (upper === 'UTF16BE') return 'UTF-16 BE'
  if (upper === 'GB2312' || upper === 'GBK' || upper === 'GB18030') {
    // iconv-lite uses 'GBK' or 'GB18030' (GB18030 is a superset of GBK)
    return 'GB18030'
  }
  return encoding
}
