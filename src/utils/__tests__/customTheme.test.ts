import { describe, expect, it } from 'vitest'
import { themeStyles } from '../../types'
import { generateCustomThemeCSS, getCustomThemeBackground, isCustomThemeDark } from '../customTheme'

describe('custom theme helpers', () => {
  it('classifies solid themes by luminance', () => {
    expect(isCustomThemeDark({ type: 'solid', color: '#111111' })).toBe(true)
    expect(isCustomThemeDark({ type: 'solid', color: '#ffffff' })).toBe(false)
  })

  it('builds the configured gradient background', () => {
    expect(getCustomThemeBackground({
      type: 'gradient',
      gradientType: 'linear',
      gradientAngle: 90,
      gradientStops: [
        { color: '#111111', position: 0 },
        { color: '#eeeeee', position: 100 },
      ],
    })).toBe('linear-gradient(90deg, #111111 0%, #eeeeee 100%)')
  })

  it('targets iframe bodies and native reader content with contrasting colors', () => {
    expect(themeStyles.light).toContain('body.light')
    expect(themeStyles.light).toContain('[data-reader-content].light')
    expect(themeStyles.light).toContain('color: #25211d')
    expect(themeStyles.dark).toContain('color: #eee6d9')
    expect(themeStyles.sepia).toContain('color: #493a2d')
  })

  it('scopes custom themes to every reader format', () => {
    const css = generateCustomThemeCSS({ type: 'solid', color: '#ffffff' })
    expect(css).toContain('body.custom')
    expect(css).toContain('[data-reader-content].custom')
    expect(css).toContain('rgba(20,20,20,0.92)')
  })
})
