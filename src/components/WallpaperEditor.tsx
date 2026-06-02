import { useState, useCallback } from 'react'
import { CustomBgConfig, GradientStop, GradientType, presetGradients } from '../types'
import { parseRGBA, rgbaToString } from '../utils/customTheme'

interface WallpaperEditorProps {
  config: CustomBgConfig
  onChange: (config: CustomBgConfig) => void
}

type Tab = 'preset' | 'color' | 'gradient' | 'image'

const TAB_LABELS: Record<Tab, string> = {
  preset: '预设',
  color: '纯色',
  gradient: '渐变',
  image: '图片',
}

export function WallpaperEditor({ config, onChange }: WallpaperEditorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('preset')

  // Local edit state for gradient tab
  const [gradientType, setGradientType] = useState<GradientType>(
    config.gradient?.gradientType ?? 'linear'
  )
  const [gradientAngle, setGradientAngle] = useState(
    config.gradient?.gradientAngle ?? 135
  )
  const [gradientStops, setGradientStops] = useState<GradientStop[]>(
    config.gradient?.gradientStops ?? [
      { color: 'rgba(59,130,246,0.85)', position: 0 },
      { color: 'rgba(16,42,67,0.95)', position: 100 },
    ]
  )

  // Local edit state for color tab
  const [alpha, setAlpha] = useState(() => {
    if (config.color) {
      const [, , , a] = parseRGBA(config.color)
      return Math.round(a * 100)
    }
    return 100
  })

  const currentColor = config.color
    ? (() => {
        const [r, g, b] = parseRGBA(config.color)
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      })()
    : '#3b82f6'

  const handleColorChange = useCallback(
    (hex: string) => {
      const fullHex = hex.length === 4 ? hex.replace(/([a-f0-9])/gi, '$1$1') : hex
      const r = parseInt(fullHex.slice(0, 2), 16)
      const g = parseInt(fullHex.slice(2, 4), 16)
      const b = parseInt(fullHex.slice(4, 6), 16)
      const a = alpha / 100
      onChange({ type: 'color', color: rgbaToString(r, g, b, a) })
    },
    [alpha, onChange]
  )

  const handleAlphaChange = useCallback(
    (val: number) => {
      setAlpha(val)
      if (config.type === 'color' && config.color) {
        const [r, g, b] = parseRGBA(config.color)
        onChange({ type: 'color', color: rgbaToString(r, g, b, val / 100) })
      }
    },
    [config, onChange]
  )

  const handleGradientTypeChange = useCallback(
    (t: GradientType) => {
      setGradientType(t)
      onChange({
        type: 'gradient',
        gradient: { type: 'gradient', gradientType: t, gradientAngle, gradientStops },
      })
    },
    [gradientAngle, gradientStops, onChange]
  )

  const handleAngleChange = useCallback(
    (val: number) => {
      setGradientAngle(val)
      onChange({
        type: 'gradient',
        gradient: { type: 'gradient', gradientType, gradientAngle: val, gradientStops },
      })
    },
    [gradientType, gradientStops, onChange]
  )

  const updateStop = useCallback(
    (idx: number, patch: Partial<GradientStop>) => {
      const updated = gradientStops.map((s, i) => (i === idx ? { ...s, ...patch } : s))
      setGradientStops(updated)
      onChange({
        type: 'gradient',
        gradient: { type: 'gradient', gradientType, gradientAngle, gradientStops: updated },
      })
    },
    [gradientType, gradientAngle, gradientStops, onChange]
  )

  const addStop = useCallback(() => {
    const lastPos = gradientStops.length > 0 ? gradientStops[gradientStops.length - 1].position : 0
    const newStops = [
      ...gradientStops,
      { color: 'rgba(128,128,128,0.85)', position: Math.min(100, lastPos + 25) },
    ]
    setGradientStops(newStops)
    onChange({
      type: 'gradient',
      gradient: { type: 'gradient', gradientType, gradientAngle, gradientStops: newStops },
    })
  }, [gradientStops, gradientType, gradientAngle, onChange])

  const removeStop = useCallback(
    (idx: number) => {
      if (gradientStops.length <= 2) return
      const newStops = gradientStops.filter((_, i) => i !== idx)
      setGradientStops(newStops)
      onChange({
        type: 'gradient',
        gradient: { type: 'gradient', gradientType, gradientAngle, gradientStops: newStops },
      })
    },
    [gradientStops, gradientType, gradientAngle, onChange]
  )

  const applyPresetGradient = useCallback(
    (p: (typeof presetGradients)[number]) => {
      onChange({
        type: 'gradient',
        gradient: { type: 'gradient', gradientType: p.type, gradientAngle: p.angle, gradientStops: p.stops },
      })
    },
    [onChange]
  )

  const buildGradientCss = useCallback(() => {
    const stops = gradientStops.map(s => `${s.color} ${s.position}%`).join(', ')
    if (!stops) return 'transparent'
    if (gradientType === 'radial') {
      return `radial-gradient(ellipse at center, ${stops})`
    }
    return `linear-gradient(${gradientAngle}deg, ${stops})`
  }, [gradientType, gradientAngle, gradientStops])

  return (
    <div style={styles.container}>
      {/* Tab bar */}
      <div style={styles.tabBar}>
        {(Object.keys(TAB_LABELS) as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {}),
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={styles.content}>
        {/* 预设 tab */}
        {activeTab === 'preset' && (
          <div style={styles.presetGrid}>
            {presetGradients.map(p => {
              const isActive = config.type === 'preset' && config.presetKey === p.label
              const stops = p.stops.map(s => `${s.color} ${s.position}%`).join(', ')
              const preview =
                p.type === 'radial'
                  ? `radial-gradient(ellipse at center, ${stops})`
                  : `linear-gradient(${p.angle}deg, ${stops})`
              return (
                <button
                  key={p.label}
                  onClick={() => onChange({ type: 'preset', presetKey: p.label })}
                  style={{
                    ...styles.presetBtn,
                    background: preview,
                    ...(isActive ? styles.presetBtnActive : {}),
                  }}
                  title={p.label}
                >
                  {isActive && <span style={styles.checkmark}>✓</span>}
                </button>
              )
            })}
          </div>
        )}

        {/* 纯色 tab */}
        {activeTab === 'color' && (
          <div style={styles.section}>
            <div style={styles.row}>
              <span style={styles.label}>颜色</span>
              <input
                type="color"
                value={currentColor}
                onChange={e => handleColorChange(e.target.value)}
                style={styles.colorPicker}
              />
            </div>
            <div style={styles.row}>
              <span style={styles.label}>透明度</span>
              <input
                type="range"
                min={70}
                max={100}
                step={1}
                value={alpha}
                onChange={e => handleAlphaChange(Number(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.alphaValue}>{alpha}%</span>
            </div>
            <div
              style={{
                ...styles.previewSwatch,
                background: config.type === 'color' ? config.color : 'rgba(59,130,246,1)',
              }}
            />
          </div>
        )}

        {/* 渐变 tab */}
        {activeTab === 'gradient' && (
          <div style={styles.section}>
            {/* Type toggle */}
            <div style={styles.row}>
              <span style={styles.label}>类型</span>
              <div style={styles.toggleGroup}>
                <button
                  onClick={() => handleGradientTypeChange('linear')}
                  style={{
                    ...styles.toggleBtn,
                    ...(gradientType === 'linear' ? styles.toggleBtnActive : {}),
                  }}
                >
                  线性
                </button>
                <button
                  onClick={() => handleGradientTypeChange('radial')}
                  style={{
                    ...styles.toggleBtn,
                    ...(gradientType === 'radial' ? styles.toggleBtnActive : {}),
                  }}
                >
                  径向
                </button>
              </div>
            </div>

            {/* Angle slider (only for linear) */}
            {gradientType === 'linear' && (
              <div style={styles.row}>
                <span style={styles.label}>角度</span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={15}
                  value={gradientAngle}
                  onChange={e => handleAngleChange(Number(e.target.value))}
                  style={styles.slider}
                />
                <span style={styles.alphaValue}>{gradientAngle}°</span>
              </div>
            )}

            {/* Color stops */}
            <div style={styles.stopsSection}>
              {gradientStops.map((stop, idx) => (
                <div key={idx} style={styles.stopRow}>
                  <input
                    type="color"
                    value={(() => {
                      const c = stop.color
                      if (c.startsWith('#')) return c
                      const [r, g, b] = parseRGBA(c)
                      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
                    })()}
                    onChange={e => {
                      const hex = e.target.value
                      const r = parseInt(hex.slice(0, 2), 16)
                      const g = parseInt(hex.slice(2, 4), 16)
                      const b = parseInt(hex.slice(4, 6), 16)
                      updateStop(idx, { color: rgbaToString(r, g, b, parseRGBA(stop.color)[3]) })
                    }}
                    style={styles.colorPickerSmall}
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={stop.position}
                    onChange={e => updateStop(idx, { position: Number(e.target.value) })}
                    style={styles.slider}
                  />
                  <span style={styles.posValue}>{stop.position}%</span>
                  {gradientStops.length > 2 && (
                    <button onClick={() => removeStop(idx)} style={styles.removeBtn}>
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addStop} style={styles.addStopBtn}>
                + 添加色标
              </button>
            </div>

            {/* Gradient preview */}
            <div style={{ ...styles.previewSwatch, background: buildGradientCss() }} />

            {/* Preset gradients */}
            <div style={styles.presetLabel}>内置渐变</div>
            <div style={styles.presetRow}>
              {presetGradients.map(p => {
                const stops = p.stops.map(s => `${s.color} ${s.position}%`).join(', ')
                const preview =
                  p.type === 'radial'
                    ? `radial-gradient(ellipse at center, ${stops})`
                    : `linear-gradient(${p.angle}deg, ${stops})`
                return (
                  <button
                    key={p.label}
                    onClick={() => applyPresetGradient(p)}
                    style={{ ...styles.presetMini, background: preview }}
                    title={p.label}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* 图片 tab placeholder */}
        {activeTab === 'image' && (
          <div style={styles.placeholder}>
            <span style={styles.placeholderText}>图片背景（待 T7 实现）</span>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(20,15,50,0.92)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  tabBar: {
    display: 'flex',
    gap: 4,
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    padding: '8px 4px',
    border: 'none',
    borderRadius: 8,
    background: 'transparent',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    background: 'rgba(139,92,246,0.5)',
    color: '#fff',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    minWidth: 48,
  },
  colorPicker: {
    width: 80,
    height: 32,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    padding: 0,
    background: 'transparent',
  },
  colorPickerSmall: {
    width: 36,
    height: 28,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    padding: 0,
    background: 'transparent',
  },
  slider: {
    flex: 1,
    height: 4,
    accentColor: '#8b5cf6',
  },
  alphaValue: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    minWidth: 36,
    textAlign: 'right',
  },
  previewSwatch: {
    height: 60,
    borderRadius: 10,
    width: '100%',
  },
  toggleGroup: {
    display: 'flex',
    gap: 4,
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    padding: '5px 10px',
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  toggleBtnActive: {
    background: 'rgba(139,92,246,0.5)',
    color: '#fff',
  },
  stopsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  stopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  posValue: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    minWidth: 30,
    textAlign: 'right',
  },
  removeBtn: {
    width: 22,
    height: 22,
    border: 'none',
    borderRadius: 6,
    background: 'rgba(239,68,68,0.3)',
    color: '#ef4444',
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStopBtn: {
    padding: '6px 12px',
    border: '1px dashed rgba(255,255,255,0.2)',
    borderRadius: 8,
    background: 'transparent',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  presetLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  presetRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  presetMini: {
    width: 40,
    height: 32,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    position: 'relative' as const,
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  presetBtn: {
    height: 56,
    border: '2px solid transparent',
    borderRadius: 10,
    cursor: 'pointer',
    position: 'relative' as const,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetBtnActive: {
    border: '2px solid rgba(139,92,246,0.8)',
  },
  checkmark: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 700,
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  },
  placeholder: {
    padding: '32px 16px',
    textAlign: 'center' as const,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
}