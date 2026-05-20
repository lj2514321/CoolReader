import { CustomTheme, GradientStop, CustomPreset, presetGradients as builtInPresets } from '../types'

export function parseRGBA(color: string): [number, number, number, number] {
  if (color.startsWith('rgba(')) {
    const parts = color.replace('rgba(', '').replace(')', '').split(',').map(s => s.trim())
    return [parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]), parseFloat(parts[3])]
  }
  if (color.startsWith('rgb(')) {
    const parts = color.replace('rgb(', '').replace(')', '').split(',').map(s => s.trim())
    return [parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]), 1]
  }
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 6) {
      return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 1]
    }
    if (hex.length === 3) {
      return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16), 1]
    }
  }
  return [255, 255, 255, 1]
}

export function rgbaToString(r: number, g: number, b: number, a: number): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`
}

function linearize(c: number): number {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function getLuminance(color: string): number {
  const [r, g, b] = parseRGBA(color)
  return 0.2126 * linearize(r / 255) + 0.7152 * linearize(g / 255) + 0.0722 * linearize(b / 255)
}

export function getGradientLuminance(stops: GradientStop[]): number {
  if (!stops || stops.length === 0) return 1
  let totalWeight = 0
  let weightedLum = 0
  for (const stop of stops) {
    const lum = getLuminance(stop.color)
    const weight = stop.position === 0 || stop.position === 100 ? 1 : 2
    weightedLum += lum * weight
    totalWeight += weight
  }
  return weightedLum / totalWeight
}

function getAutoTextColor(theme: CustomTheme): string {
  let lum: number
  if (theme.type === 'solid') {
    lum = getLuminance(theme.color || 'rgba(255,255,255,1)')
  } else {
    lum = getGradientLuminance(theme.gradientStops || [])
  }
  return lum < 0.4
    ? (theme.textColorDark || 'rgba(255,255,255,0.87)')
    : (theme.textColorLight || 'rgba(15,23,42,0.88)')
}

export function generateCustomThemeCSS(theme: CustomTheme): string {
  const textColor = getAutoTextColor(theme)

  let bg: string
  if (theme.type === 'solid') {
    bg = theme.color || 'rgba(255,255,255,1)'
  } else {
    const stops = (theme.gradientStops || []).map(s => `${s.color} ${s.position}%`).join(', ')
    if (theme.gradientType === 'radial') {
      bg = `radial-gradient(ellipse at center, ${stops})`
    } else {
      bg = `linear-gradient(${theme.gradientAngle ?? 135}deg, ${stops})`
    }
  }

  return `body.custom { background: ${bg} !important; color: ${textColor} !important; }`
}

export function applyColorAlpha(color: string, alpha: number): string {
  const [r, g, b] = parseRGBA(color)
  return rgbaToString(r, g, b, alpha)
}

export async function saveCustomPresets(presets: CustomPreset[]): Promise<void> {
  await window.electronAPI?.saveSetting('customPresets', JSON.stringify(presets))
}

export async function loadCustomPresets(): Promise<CustomPreset[]> {
  try {
    const raw = await window.electronAPI?.loadSetting('customPresets')
    if (raw) return JSON.parse(raw) as CustomPreset[]
  } catch { }
  return []
}

export function getAllPresets(): { label: string; theme: CustomTheme }[] {
  return [
    ...builtInPresets.map(p => ({
      label: p.label,
      theme: {
        type: 'gradient',
        gradientType: p.type,
        gradientAngle: p.angle,
        gradientStops: p.stops,
      } as CustomTheme,
    })),
  ]
}