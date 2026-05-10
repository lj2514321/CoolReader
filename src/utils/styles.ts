import type { CSSProperties } from 'react'

export const glass: CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  backdropFilter: 'blur(24px) saturate(140%)',
  WebkitBackdropFilter: 'blur(24px) saturate(140%)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
}

export const btnGlass: CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#fff',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600 as CSSProperties['fontWeight'],
  padding: '10px 24px',
  position: 'relative',
  zIndex: 2,
  transition: 'all 0.2s ease',
}

export const colors = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
] as const

export const defGrad = 'linear-gradient(135deg, #0a0a1a 0%, #1a1040 40%, #0d1137 100%)'

export const bgPresets = [
  { key: 'deepPurple', label: '深紫', gradient: 'linear-gradient(135deg, #0a0a1a 0%, #1a1040 40%, #0d1137 100%)' },
  { key: 'midnight', label: '午夜蓝', gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
  { key: 'emerald', label: '翡翠', gradient: 'linear-gradient(135deg, #0a1a0f 0%, #1a4030 50%, #0d3727 100%)' },
  { key: 'amber', label: '琥珀', gradient: 'linear-gradient(135deg, #1a150a 0%, #403520 50%, #372d17 100%)' },
  { key: 'slate', label: '石板', gradient: 'linear-gradient(135deg, #0f111a 0%, #1a1d2e 50%, #111827 100%)' },
  { key: 'crimson', label: '绯红', gradient: 'linear-gradient(135deg, #1a0a0a 0%, #401025 50%, #370d1a 100%)' },
]
