export const colors = [
  ['#2d5a5a', '#1f4747'],
  ['#d4a574', '#b88a5a'],
  ['#3d7a7a', '#2d5a5a'],
  ['#c87a3a', '#a86530'],
  ['#4a6670', '#2d4a54'],
] as const

/* 与 src/styles/tokens.css --paper-texture/--wash-bg-page 及 src/types/index.ts paperTexture() 保持同步 */
const paperDark = 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22200%22 height=%22200%22 filter=%22url(%23n)%22 opacity=%220.10%22/%3E%3C/svg%3E")'

const paperLight = 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22200%22 height=%22200%22 filter=%22url(%23n)%22 opacity=%220.07%22/%3E%3C/svg%3E")'

const washDark = `${paperDark}, radial-gradient(1000px 520px at 12% -8%, rgba(212,165,116,0.13), transparent 55%), radial-gradient(760px 460px at 108% 18%, rgba(65,65,75,0.50), transparent 65%), radial-gradient(640px 420px at 75% 112%, rgba(43,43,51,0.85), transparent 70%), radial-gradient(900px 480px at -10% 85%, rgba(54,54,63,0.55), transparent 60%), #1a1a1f`

const washLight = `${paperLight}, radial-gradient(1000px 520px at 12% -8%, rgba(240,228,204,0.75), transparent 55%), radial-gradient(760px 460px at 108% 18%, rgba(208,201,185,0.50), transparent 65%), radial-gradient(640px 420px at 75% 112%, rgba(233,229,219,0.95), transparent 70%), #f7f4ed`

export const defGrad = washDark

export const flatDefGrad = washLight

/** Glass theme presets (dark — 暗夜书房) */
export const glassPresets = [
  { key: 'inkNight', label: '墨夜', gradient: washDark },
  { key: 'inkCyan', label: '墨青', gradient: 'linear-gradient(135deg, #141f1f 0%, #1a2e2e 50%, #1f3a3a 100%)' },
  { key: 'amber', label: '琥珀', gradient: 'linear-gradient(135deg, #1a150a 0%, #2a2010 50%, #1f1a0f 100%)' },
  { key: 'slate', label: '石板', gradient: 'linear-gradient(135deg, #16171c 0%, #1c1d24 50%, #22232c 100%)' },
  { key: 'crimson', label: '绯红', gradient: 'linear-gradient(135deg, #1c1215 0%, #2a1520 50%, #1f1018 100%)' },
  { key: 'forest', label: '森林', gradient: 'linear-gradient(135deg, #0f1a12 0%, #152a1a 50%, #10201a 100%)' },
]

/** Flat theme presets (light — 日间图书馆) */
export const flatPresets = [
  { key: 'warmPaper', label: '暖纸', gradient: washLight },
  { key: 'frostWhite', label: '霜白', gradient: 'linear-gradient(135deg, #fafaf8 0%, #f2f0ec 100%)' },
  { key: 'springMist', label: '春雾', gradient: 'linear-gradient(135deg, #f0f5f0 0%, #e4ece4 100%)' },
  { key: 'skyLight', label: '天光', gradient: 'linear-gradient(135deg, #f0f3f7 0%, #e0e8f0 100%)' },
  { key: 'warmGlow', label: '暖光', gradient: 'linear-gradient(135deg, #f7f0e0 0%, #efe4cc 100%)' },
  { key: 'roseDust', label: '玫瑰', gradient: 'linear-gradient(135deg, #f7eff0 0%, #f0e0e4 100%)' },
]

/** Backward-compatible alias */
export const bgPresets = glassPresets

/** Returns the preset list for the given theme */
export function getPresets(theme: string) {
  return theme === 'flat' ? flatPresets : glassPresets
}