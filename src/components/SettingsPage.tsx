import { useState, useRef, useEffect } from 'react'
import { getPresets } from '../utils/styles'
import { saveSetting, loadSetting } from '../utils/db'
import { SyncSettings } from './SyncSettings'
import { AISettings } from './AISettings'
import { defaultLayout, CustomBgConfig, CustomTheme, GradientStop, GradientType } from '../types'
import type { WebDAVConfig, AIConfig, ReadingGoal } from '../types'
import { useTheme, type UiTheme } from '../styles/useTheme'
import '../styles/components/settings.css'

type CustomBgTab = 'preset' | 'color' | 'gradient' | 'image'

interface SettingsPageProps {
  bgKey: string
  onPresetChange: (key: string, gradient: string) => void
  resetKey?: number
  webdavConfig?: WebDAVConfig | null
  onWebDAVConfigChange?: (config: WebDAVConfig | null) => void
  aiConfig?: AIConfig | null
  onAIConfigChange?: (config: AIConfig | null) => void
  onCustomBgChange?: (config: CustomBgConfig) => void
}

export function SettingsPage({ bgKey, onPresetChange, resetKey = 0, webdavConfig, onWebDAVConfigChange, aiConfig, onAIConfigChange, onCustomBgChange }: SettingsPageProps) {
  const [settingView, setSettingView] = useState<string | null>(null)
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const settingTriggerRef = useRef<string | null>(null)
  useEffect(() => { setSettingView(null) }, [resetKey])
  useEffect(() => { setCustomTab('preset') }, [resetKey])
  useEffect(() => {
    if (settingView) requestAnimationFrame(() => backButtonRef.current?.focus())
  }, [settingView])

  const [goalMinutes, setGoalMinutes] = useState(30)
  const [goalLoaded, setGoalLoaded] = useState(false)
  useEffect(() => {
    loadSetting('readingGoal').then((v) => {
      if (v) {
        try { setGoalMinutes(JSON.parse(v).dailyMinutes || 0) } catch { setGoalMinutes(0) }
      } else {
        setGoalMinutes(0)
      }
      setGoalLoaded(true)
    })
  }, [])

  const [enableMediaKey, setEnableMediaKey] = useState(true)
  useEffect(() => {
    loadSetting('readerLayout').then((v) => {
      if (v) {
        try {
          const parsed = JSON.parse(v)
          setEnableMediaKey(parsed.enableMediaKey ?? true)
        } catch { setEnableMediaKey(true) }
      }
    })
  }, [])

  const [startupBehavior, setStartupBehavior] = useState<'library' | 'resume'>('library')
  useEffect(() => {
    loadSetting('startupBehavior').then((v) => {
      if (v === 'library' || v === 'resume') setStartupBehavior(v)
    })
  }, [])

  // Bg preset tab state
  const [customTab, setCustomTab] = useState<CustomBgTab>('preset')
  const [customColor, setCustomColor] = useState('#4f8f8f')
  const [customColorAlpha, setCustomColorAlpha] = useState(90)
  const [gradientType, setGradientType] = useState<GradientType>('linear')
  const [gradientAngle, setGradientAngle] = useState(135)
  const [gradientStop1, setGradientStop1] = useState<GradientStop>({ color: 'rgba(79,143,143,0.85)', position: 0 })
  const [gradientStop2, setGradientStop2] = useState<GradientStop>({ color: 'rgba(105,170,170,0.9)', position: 100 })

  const { theme: uiTheme, setTheme: setUiTheme } = useTheme()

  const pushDetail = (id: string) => {
    settingTriggerRef.current = id
    setSettingView(id)
  }

  const popDetail = () => {
    setSettingView(null)
    requestAnimationFrame(() => {
      if (settingTriggerRef.current) document.getElementById(`setting-${settingTriggerRef.current}`)?.focus()
    })
  }

  const subViewTitle = settingView === 'bgPreset' ? '首页背景'
    : settingView === 'readingGoal' ? '阅读目标'
    : settingView === 'webdav' ? 'WebDAV 同步'
    : settingView === 'ai' ? 'AI 助手'
    : settingView === 'startup' ? '启动行为'
    : settingView === 'mediaKey' ? '媒体键翻页'
    : settingView === 'theme' ? '界面风格' : ''

  return (
    <>
      {settingView === null ? (
      <div className="settings-container">
        <h1 className="settings-title">设置</h1>
        {[
          { id: 'bgPreset', label: '首页背景', summary: getPresets(uiTheme).find((b) => b.key === bgKey)?.label || '' },
          { id: 'readingGoal', label: '阅读目标', summary: goalMinutes > 0 ? `${goalMinutes} 分钟/天` : '未设置' },
          { id: 'webdav', label: 'WebDAV 同步', summary: webdavConfig ? `已配置 (${webdavConfig.url})` : '' },
          { id: 'ai', label: 'AI 助手', summary: aiConfig ? `已配置 (${aiConfig.model})` : '' },
          { id: 'startup', label: '启动行为', summary: startupBehavior === 'resume' ? '继续阅读' : '显示书架' },
          { id: 'mediaKey', label: '媒体键翻页', summary: enableMediaKey ? '已启用' : '已禁用' },
          { id: 'theme', label: '界面风格', summary: uiTheme === 'glass' ? '毛玻璃' : '扁平' },
        ].map((item) => (
          <button id={`setting-${item.id}`} type="button" key={item.id} className="setting-item" onClick={() => pushDetail(item.id)}>
            <div>
              <div className="setting-label">{item.label}</div>
              {item.summary && <div className="setting-value">{item.summary}</div>}
            </div>
            <span className="setting-arrow">›</span>
          </button>
        ))}
      </div>
      ) : (
      <div className="settings-sub-view">
        {/* Back button - shared */}
        <button ref={backButtonRef} type="button" className="settings-back-btn" onClick={popDetail}>
          <span className="settings-back-arrow">‹</span>
          <span className="settings-sub-title">{subViewTitle}</span>
        </button>

        {settingView === 'bgPreset' && (
          <div className="settings-sub-content">
            {/* Tab bar */}
            <div role="tablist" aria-label="首页背景类型" style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
              {(['preset', 'color', 'gradient', 'image'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setCustomTab(tab)}
                  className={`settings-bg-tab ${customTab === tab ? 'active' : ''}`}
                  role="tab"
                  aria-selected={customTab === tab}
                >
                  {tab === 'preset' ? '预设' : tab === 'color' ? '纯色' : tab === 'gradient' ? '渐变' : '图片'}
                </button>
              ))}
            </div>

            {/* Preset tab */}
            {customTab === 'preset' && (
              <div className="bg-preset-grid">
                {getPresets(uiTheme).map((p) => (
                  <button
                    key={p.key}
                    className={`bg-preset-item ${bgKey === p.key ? 'active' : ''}`}
                    onClick={() => { saveSetting(uiTheme === 'flat' ? 'bgPreset-flat' : 'bgPreset', p.key); onPresetChange(p.key, p.gradient); onCustomBgChange?.({ type: 'preset', presetKey: p.key }) }}
                    aria-pressed={bgKey === p.key}
                  >
                    <div className="bg-preset-preview" style={{ background: p.gradient }}>
                      {bgKey === p.key && <span className="bg-preset-check">✓</span>}
                    </div>
                    <div className="bg-preset-name">{p.label}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Color tab */}
            {customTab === 'color' && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <div className="settings-section-label">颜色</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="color"
                      aria-label="首页背景颜色"
                      value={customColor}
                      onChange={e => {
                        setCustomColor(e.target.value)
                        onCustomBgChange?.({ type: 'color', color: hexToRgba(e.target.value, customColorAlpha / 100) })
                      }}
                      style={{ width: 44, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'none' }}
                    />
                    <div
                      className="settings-color-preview"
                      style={{
                        flex: 1, height: 36, borderRadius: 8,
                        background: hexToRgba(customColor, customColorAlpha / 100),
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="settings-section-label">透明度 {customColorAlpha}%</div>
                  <input
                    type="range"
                    aria-label="首页背景透明度"
                    min={70} max={100} step={1}
                    value={customColorAlpha}
                    onChange={e => {
                      const alpha = parseInt(e.target.value)
                      setCustomColorAlpha(alpha)
                      onCustomBgChange?.({ type: 'color', color: hexToRgba(customColor, alpha / 100) })
                    }}
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                  />
                </div>
              </div>
            )}

            {/* Gradient tab */}
            {customTab === 'gradient' && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <div className="settings-section-label">类型</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['linear', 'radial'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setGradientType(t)}
                        className={`settings-bg-tab ${gradientType === t ? 'active' : ''}`}
                        aria-pressed={gradientType === t}
                      >
                        {t === 'linear' ? '线性' : '径向'}
                      </button>
                    ))}
                  </div>
                </div>
                {gradientType === 'linear' && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="settings-section-label">角度 {gradientAngle}°</div>
                    <input
                      type="range" min={0} max={360} step={1}
                      aria-label="渐变角度"
                      value={gradientAngle}
                      onChange={e => {
                        const angle = parseInt(e.target.value)
                        setGradientAngle(angle)
                        onCustomBgChange?.({ type: 'gradient', gradient: buildGradientConfig(gradientType, angle, gradientStop1, gradientStop2) })
                      }}
                      style={{ width: '100%', accentColor: 'var(--accent)' }}
                    />
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div className="settings-section-label">起始色</div>
                    <input
                      type="color"
                      aria-label="渐变起始色"
                      value={gradientStop1.color.startsWith('rgba') ? '#000000' : gradientStop1.color}
                      onChange={e => {
                        const stop1: GradientStop = { ...gradientStop1, color: rgbaFromHex(e.target.value, 0.85) }
                        setGradientStop1(stop1)
                        onCustomBgChange?.({ type: 'gradient', gradient: buildGradientConfig(gradientType, gradientAngle, stop1, gradientStop2) })
                      }}
                      style={{ width: '100%', height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'none' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="settings-section-label">结束色</div>
                    <input
                      type="color"
                      aria-label="渐变结束色"
                      value={gradientStop2.color.startsWith('rgba') ? '#000000' : gradientStop2.color}
                      onChange={e => {
                        const stop2: GradientStop = { ...gradientStop2, color: rgbaFromHex(e.target.value, 0.9) }
                        setGradientStop2(stop2)
                        onCustomBgChange?.({ type: 'gradient', gradient: buildGradientConfig(gradientType, gradientAngle, gradientStop1, stop2) })
                      }}
                      style={{ width: '100%', height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'none' }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div className="settings-section-label">预览</div>
                  <div
                    className="settings-color-preview"
                    style={{
                      height: 48, borderRadius: 8,
                      background: buildGradientString(gradientType, gradientAngle, gradientStop1, gradientStop2),
                    }}
                  />
                </div>
              </div>
            )}

            {/* Image tab */}
            {customTab === 'image' && (
              <div className="settings-placeholder">
                上传功能开发中
              </div>
            )}
          </div>
        )}

        {settingView === 'webdav' && (
          <SyncSettings config={webdavConfig ?? null} onConfigChange={onWebDAVConfigChange ?? (() => {})} />
        )}

        {settingView === 'ai' && (
          <AISettings config={aiConfig ?? null} onConfigChange={onAIConfigChange ?? (() => {})} />
        )}

        {settingView === 'readingGoal' && (
          <div className="settings-sub-content">
            <div className="goal-label">每日阅读目标</div>
            <div className="goal-input-row">
              <input type="number" min={0} max={480} step={5}
                className="goal-input"
                aria-label="每日阅读目标分钟数"
                value={goalMinutes}
                onChange={e => setGoalMinutes(Math.max(0, Math.min(480, parseInt(e.target.value) || 0)))}
              />
              <span className="goal-unit">分钟 / 天</span>
            </div>
            <div className="goal-hint">
              设为 0 关闭阅读目标
            </div>
            <button className="save-btn" onClick={() => {
              saveSetting('readingGoal', JSON.stringify({ dailyMinutes: goalMinutes } as ReadingGoal))
              popDetail()
            }}>保存</button>
          </div>
        )}

        {settingView === 'startup' && (
          <div className="settings-sub-content">
            <div className="goal-label">启动后显示</div>
            <div className="radio-group">
              {[
                { value: 'library' as const, label: '书架', desc: '启动时显示书架页面' },
                { value: 'resume' as const, label: '继续阅读', desc: '自动打开上次阅读的图书' },
              ].map(opt => (
                <label
                  key={opt.value}
                  className={`radio-option ${startupBehavior === opt.value ? 'selected' : ''}`}
                >
                  <input type="radio" name="startup" value={opt.value}
                    checked={startupBehavior === opt.value}
                    onChange={() => setStartupBehavior(opt.value)}
                    className="radio-input"
                  />
                  <div>
                    <div className="radio-label">{opt.label}</div>
                    <div className="radio-desc">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            <button className="save-btn" onClick={() => {
              saveSetting('startupBehavior', startupBehavior)
              popDetail()
            }}>保存</button>
          </div>
        )}

        {settingView === 'mediaKey' && (
          <div className="settings-sub-content">
            <div className="toggle-row">
              <div>
                <div className="toggle-info-title">启用媒体键</div>
                <div className="toggle-info-desc">
                  支持 Mac 触控栏和蓝牙键盘的 ◀▸ 按钮翻页
                </div>
              </div>
              <input type="checkbox" checked={enableMediaKey}
                onChange={e => setEnableMediaKey(e.target.checked)}
                className="toggle-switch"
                aria-label="启用媒体键翻页"
              />
            </div>
            <button className="save-btn" onClick={() => {
              saveSetting('readerLayout', JSON.stringify({ ...defaultLayout, enableMediaKey }))
              popDetail()
            }}>保存</button>
          </div>
        )}

        {settingView === 'theme' && (
          <div className="settings-sub-content" style={{ padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <div className="goal-label">选择界面风格</div>
              <div style={{ fontSize: 12, marginTop: 4 }} className="settings-placeholder">
                选择后立即生效，无需重启
              </div>
            </div>

            <label
              className={`radio-option ${uiTheme === 'glass' ? 'selected' : ''}`}
              style={{ marginBottom: 10 }}
            >
              <input
                type="radio"
                name="ui-theme"
                className="radio-input"
                checked={uiTheme === 'glass'}
                onChange={() => setUiTheme('glass')}
              />
              <div>
                <div className="radio-label">毛玻璃</div>
                <div className="radio-desc">玻璃质感，卡片式布局</div>
              </div>
            </label>

            <label
              className={`radio-option ${uiTheme === 'flat' ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="ui-theme"
                className="radio-input"
                checked={uiTheme === 'flat'}
                onChange={() => setUiTheme('flat')}
              />
              <div>
                <div className="radio-label">极简扁平</div>
                <div className="radio-desc">简洁干净，扁平化设计</div>
              </div>
            </label>
          </div>
        )}
      </div>
      )}
    </>
  )
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function rgbaFromHex(hex: string, alpha: number): string {
  return hexToRgba(hex, alpha)
}

function buildGradientConfig(type: GradientType, angle: number, stop1: GradientStop, stop2: GradientStop): CustomTheme {
  return {
    type: 'gradient',
    gradientType: type,
    gradientAngle: angle,
    gradientStops: [stop1, stop2],
  }
}

function buildGradientString(type: GradientType, angle: number, stop1: GradientStop, stop2: GradientStop): string {
  if (type === 'linear') {
    return `linear-gradient(${angle}deg, ${stop1.color} ${stop1.position}%, ${stop2.color} ${stop2.position}%)`
  } else {
    return `radial-gradient(circle, ${stop1.color} ${stop1.position}%, ${stop2.color} ${stop2.position}%)`
  }
}
