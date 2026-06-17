import { useState, useEffect, useCallback } from 'react'
import { CustomTheme, CustomPreset, GradientStop } from '../types'
import { parseRGBA, rgbaToString, applyColorAlpha, saveCustomPresets, loadCustomPresets, getAllPresets } from '../utils/customTheme'

interface Props {
  theme: CustomTheme
  onChange: (t: CustomTheme) => void
  onClose: () => void
}

export function CustomThemePanel({ theme, onChange, onClose }: Props) {
  const [presets, setPresets] = useState<CustomPreset[]>([])
  const [editingLabel, setEditingLabel] = useState<string>('')
  const [showPresetInput, setShowPresetInput] = useState(false)
  const [alpha, setAlpha] = useState(1)

  useEffect(() => {
    loadCustomPresets().then(setPresets)
  }, [])

  const allPresets = getAllPresets()
  const builtIn = allPresets.filter(p => !presets.find(cp => cp.label === p.label))

  const applyPreset = (p: { label: string; theme: CustomTheme }) => {
    onChange(p.theme)
    setEditingLabel(p.label)
  }

  const saveAsPreset = async () => {
    const label = editingLabel.trim() || `预设${presets.length + 1}`
    const next = [...presets, { label, theme }]
    setPresets(next)
    await saveCustomPresets(next)
    setShowPresetInput(false)
    setEditingLabel(label)
  }

  const deletePreset = async (label: string) => {
    const next = presets.filter(p => p.label !== label)
    setPresets(next)
    await saveCustomPresets(next)
  }

  const addStop = () => {
    const stops = [...(theme.gradientStops || [])]
    const lastPos = stops.length > 0 ? stops[stops.length - 1].position : 0
    stops.push({ color: `rgba(128,128,128,${alpha})`, position: Math.min(100, lastPos + 25) })
    onChange({ ...theme, type: 'gradient', gradientStops: stops })
  }

  const removeStop = (idx: number) => {
    const stops = (theme.gradientStops || []).filter((_, i) => i !== idx)
    onChange({ ...theme, gradientStops: stops })
  }

  const updateStop = (idx: number, patch: Partial<GradientStop>) => {
    const stops = (theme.gradientStops || []).map((s, i) => i === idx ? { ...s, ...patch } : s)
    onChange({ ...theme, gradientStops: stops })
  }

  const handleColorInput = (color: string) => {
    const [r, g, b] = parseRGBA(color)
    const newColor = rgbaToString(r, g, b, alpha)
    if (theme.type === 'solid') {
      onChange({ ...theme, color: newColor })
    } else {
      const stops = theme.gradientStops || []
      if (stops.length > 0) {
        const updated = [...stops]
        updated[stops.length - 1] = { ...stops[stops.length - 1], color: newColor }
        onChange({ ...theme, gradientStops: updated })
      }
    }
  }

  const previewGradient = () => {
    if (theme.type === 'solid') {
      return theme.color || 'rgba(244,237,224,1)'
    }
    const stops = (theme.gradientStops || []).map(s => `${s.color} ${s.position}%`).join(', ')
    if (!stops) return 'transparent'
    if (theme.gradientType === 'radial') {
      return `radial-gradient(ellipse at center, ${stops})`
    }
    return `linear-gradient(${theme.gradientAngle ?? 135}deg, ${stops})`
  }

  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 16, zIndex: 20,
      width: 340,
      borderRadius: 14, padding: '14px 16px',
      background: 'rgba(26,26,31,0.92)',
      backdropFilter: 'blur(24px) saturate(140%)',
      WebkitBackdropFilter: 'blur(24px) saturate(140%)',
      border: '1px solid rgba(244,237,224,0.12)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(244,237,224,0.7)' }}>自定义背景</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(244,237,224,0.4)', cursor: 'pointer', fontSize: 16 }}>×</button>
      </div>

      {/* Type toggle */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onChange({ ...theme, type: 'solid' })}
          style={{
            flex: 1, padding: '6px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: theme.type === 'solid' ? 'rgba(45,90,90,0.4)' : 'rgba(244,237,224,0.08)',
            border: '1px solid rgba(244,237,224,0.12)', color: 'rgba(244,237,224,0.8)',
          }}>
          纯色
        </button>
        <button onClick={() => onChange({ ...theme, type: 'gradient' })}
          style={{
            flex: 1, padding: '6px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: theme.type === 'gradient' ? 'rgba(45,90,90,0.4)' : 'rgba(244,237,224,0.08)',
            border: '1px solid rgba(244,237,224,0.12)', color: 'rgba(244,237,224,0.8)',
          }}>
          渐变
        </button>
      </div>

      {theme.type === 'solid' && (
        <>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={theme.color ? '#' + parseRGBA(theme.color).slice(0, 3).map(c => c.toString(16).padStart(2, '0')).join('') : '#ffffff'}
              onChange={e => handleColorInput(e.target.value)}
              style={{ width: 44, height: 32, border: 'none', cursor: 'pointer', borderRadius: 6, background: 'none' }}
            />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(244,237,224,0.5)', whiteSpace: 'nowrap' }}>透明度</span>
              <input
                type="range" min={70} max={100} value={Math.round(alpha * 100)}
                onChange={e => {
                  const a = Number(e.target.value) / 100
                  setAlpha(a)
                  if (theme.color) {
                    const [r, g, b] = parseRGBA(theme.color)
                    onChange({ ...theme, color: rgbaToString(r, g, b, a) })
                  }
                }}
                style={{ flex: 1, accentColor: '#2d5a5a', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 11, color: 'rgba(244,237,224,0.5)', minWidth: 28 }}>{Math.round(alpha * 100)}%</span>
            </div>
          </div>
        </>
      )}

      {theme.type === 'gradient' && (
        <>
          {/* Gradient type + angle */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => onChange({ ...theme, gradientType: 'linear' })}
                style={{
                  padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
                  background: (theme.gradientType || 'linear') === 'linear' ? 'rgba(45,90,90,0.4)' : 'rgba(244,237,224,0.08)',
                  border: '1px solid rgba(244,237,224,0.1)', color: 'rgba(244,237,224,0.7)',
                }}>
                线性
              </button>
              <button onClick={() => onChange({ ...theme, gradientType: 'radial' })}
                style={{
                  padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
                  background: theme.gradientType === 'radial' ? 'rgba(45,90,90,0.4)' : 'rgba(244,237,224,0.08)',
                  border: '1px solid rgba(244,237,224,0.1)', color: 'rgba(244,237,224,0.7)',
                }}>
                径向
              </button>
            </div>
            {(theme.gradientType || 'linear') === 'linear' && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'rgba(244,237,224,0.5)', whiteSpace: 'nowrap' }}>角度</span>
                <input
                  type="range" min={0} max={360} step={15} value={theme.gradientAngle ?? 135}
                  onChange={e => onChange({ ...theme, gradientAngle: Number(e.target.value) })}
                  style={{ flex: 1, accentColor: '#2d5a5a', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 11, color: 'rgba(244,237,224,0.5)', minWidth: 28 }}>{theme.gradientAngle ?? 135}°</span>
              </div>
            )}
          </div>

          {/* Preset selector */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(244,237,224,0.5)', marginBottom: 6 }}>预设</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {builtIn.map(p => (
                <button key={p.label} onClick={() => applyPreset(p)}
                  style={{
                    padding: '4px 10px', borderRadius: 16, fontSize: 11, cursor: 'pointer',
                    background: editingLabel === p.label ? 'rgba(45,90,90,0.4)' : 'rgba(244,237,224,0.08)',
                    border: '1px solid rgba(244,237,224,0.1)', color: 'rgba(244,237,224,0.7)',
                  }}>
                  {p.label}
                </button>
              ))}
              {presets.map(p => (
                <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button onClick={() => applyPreset(p)}
                    style={{
                      padding: '4px 10px', borderRadius: 16, fontSize: 11, cursor: 'pointer',
                      background: editingLabel === p.label ? 'rgba(45,90,90,0.4)' : 'rgba(244,237,224,0.08)',
                      border: '1px solid rgba(244,237,224,0.1)', color: 'rgba(244,237,224,0.7)',
                    }}>
                    {p.label}
                  </button>
                  <button onClick={() => deletePreset(p.label)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,100,100,0.6)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '2px 4px' }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Gradient preview */}
          <div style={{
            height: 36, borderRadius: 8,
            background: previewGradient(),
            border: '1px solid rgba(244,237,224,0.1)',
          }} />

          {/* Color stops */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(244,237,224,0.5)' }}>色标</span>
              <button onClick={addStop}
                style={{ background: 'none', border: '1px solid rgba(244,237,224,0.15)', color: 'rgba(244,237,224,0.5)', cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>
                + 添加
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(theme.gradientStops || []).map((stop, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="color"
                    value={'#' + parseRGBA(stop.color).slice(0, 3).map(c => c.toString(16).padStart(2, '0')).join('')}
                    onChange={e => {
                      const [r, g, b] = parseRGBA(e.target.value)
                      updateStop(idx, { color: rgbaToString(r, g, b, alpha) })
                    }}
                    style={{ width: 28, height: 24, border: 'none', cursor: 'pointer', borderRadius: 4 }}
                  />
                  <input
                    type="range" min={0} max={100} value={stop.position}
                    onChange={e => updateStop(idx, { position: Number(e.target.value) })}
                    style={{ flex: 1, accentColor: '#2d5a5a', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 11, color: 'rgba(244,237,224,0.4)', minWidth: 28 }}>{stop.position}%</span>
                  {((theme.gradientStops || []).length > 2) && (
                    <button onClick={() => removeStop(idx)}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,100,100,0.6)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Save preset */}
      {showPresetInput ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={editingLabel}
            onChange={e => setEditingLabel(e.target.value)}
            placeholder="预设名称"
            onKeyDown={e => { if (e.key === 'Enter') saveAsPreset() }}
            style={{
              flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 12,
              background: 'rgba(244,237,224,0.08)', border: '1px solid rgba(244,237,224,0.15)',
              color: 'rgba(244,237,224,0.85)', outline: 'none',
            }}
          />
          <button onClick={saveAsPreset}
            style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, background: 'rgba(45,90,90,0.5)', border: '1px solid rgba(45,90,90,0.3)', color: 'rgba(244,237,224,0.85)' }}>
            保存
          </button>
        </div>
      ) : (
        <button onClick={() => setShowPresetInput(true)}
          style={{
            padding: '6px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12,
            background: 'rgba(244,237,224,0.06)', border: '1px solid rgba(244,237,224,0.1)',
            color: 'rgba(244,237,224,0.6)',
          }}>
          保存当前为预设
        </button>
      )}
    </div>
  )
}