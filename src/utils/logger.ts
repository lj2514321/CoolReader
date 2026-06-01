const isDev = import.meta.env.DEV

export const logger = {
  debug: (...args: unknown[]) => isDev && console.log('[debug]', ...args),
  info:  (...args: unknown[]) => isDev && console.log('[info]', ...args),
  warn:  (...args: unknown[]) => console.warn('[warn]', ...args),
  error: (...args: unknown[]) => console.error('[error]', ...args),
}
