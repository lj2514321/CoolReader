export const colors = [
  ['#2d5a5a', '#1f4747'],
  ['#d4a574', '#b88a5a'],
  ['#3d7a7a', '#2d5a5a'],
  ['#c87a3a', '#a86530'],
  ['#4a6670', '#2d4a54'],
] as const

export const defGrad = 'linear-gradient(135deg, #1a1a1f 0%, #1f1f25 50%, #26262d 100%)'

export const flatDefGrad = 'linear-gradient(135deg, #f7f4ed 0%, #efe9dd 100%)'

/** Glass theme presets (dark — 暗夜书房) */
export const glassPresets = [
  { key: 'inkNight', label: '墨夜', gradient: 'linear-gradient(135deg, #1a1a1f 0%, #1f1f25 50%, #26262d 100%)' },
  { key: 'inkCyan', label: '墨青', gradient: 'linear-gradient(135deg, #141f1f 0%, #1a2e2e 50%, #1f3a3a 100%)' },
  { key: 'amber', label: '琥珀', gradient: 'linear-gradient(135deg, #1a150a 0%, #2a2010 50%, #1f1a0f 100%)' },
  { key: 'slate', label: '石板', gradient: 'linear-gradient(135deg, #16171c 0%, #1c1d24 50%, #22232c 100%)' },
  { key: 'crimson', label: '绯红', gradient: 'linear-gradient(135deg, #1c1215 0%, #2a1520 50%, #1f1018 100%)' },
  { key: 'forest', label: '森林', gradient: 'linear-gradient(135deg, #0f1a12 0%, #152a1a 50%, #10201a 100%)' },
]

/** Flat theme presets (light — 日间图书馆) */
export const flatPresets = [
  { key: 'warmPaper', label: '暖纸', gradient: 'linear-gradient(135deg, #f7f4ed 0%, #efe9dd 100%)' },
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