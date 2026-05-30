export const colors = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
] as const

export const defGrad = 'linear-gradient(135deg, #0a0a1a 0%, #1a1040 40%, #0d1137 100%)'

export const flatDefGrad = 'linear-gradient(135deg, #f0f2f5 0%, #e8ecf1 100%)'

/** Glass theme presets (dark gradients) */
export const glassPresets = [
  { key: 'deepPurple', label: '深紫', gradient: 'linear-gradient(135deg, #0a0a1a 0%, #1a1040 40%, #0d1137 100%)' },
  { key: 'midnight', label: '午夜蓝', gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
  { key: 'emerald', label: '翡翠', gradient: 'linear-gradient(135deg, #0a1a0f 0%, #1a4030 50%, #0d3727 100%)' },
  { key: 'amber', label: '琥珀', gradient: 'linear-gradient(135deg, #1a150a 0%, #403520 50%, #372d17 100%)' },
  { key: 'slate', label: '石板', gradient: 'linear-gradient(135deg, #0f111a 0%, #1a1d2e 50%, #111827 100%)' },
  { key: 'crimson', label: '绯红', gradient: 'linear-gradient(135deg, #1a0a0a 0%, #401025 50%, #370d1a 100%)' },
]

/** Flat theme presets (light gradients) */
export const flatPresets = [
  { key: 'lightGray', label: '浅灰', gradient: 'linear-gradient(135deg, #f0f2f5 0%, #e8ecf1 100%)' },
  { key: 'frostWhite', label: '霜白', gradient: 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)' },
  { key: 'springMist', label: '春雾', gradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' },
  { key: 'skyLight', label: '天光', gradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' },
  { key: 'warmGlow', label: '暖光', gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' },
  { key: 'roseDust', label: '玫瑰', gradient: 'linear-gradient(135deg, #fff1f2 0%, #fce7f3 100%)' },
]

/** Backward-compatible alias */
export const bgPresets = glassPresets

/** Returns the preset list for the given theme */
export function getPresets(theme: string) {
  return theme === 'flat' ? flatPresets : glassPresets
}