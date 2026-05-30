import { useState, useRef, useEffect } from 'react'
import { getPresets } from '../utils/styles'
import { saveSetting, loadSetting } from '../utils/db'
import { SyncSettings } from './SyncSettings'
import { AISettings } from './AISettings'
import { defaultLayout } from '../types'
import type { WebDAVConfig, AIConfig, ReadingGoal } from '../types'
import { useTheme, type UiTheme } from '../styles/useTheme'
import '../styles/components/settings.css'

interface SettingsPageProps {
  bgKey: string
  onPresetChange: (key: string, gradient: string) => void
  resetKey?: number
  visible?: boolean
  webdavConfig?: WebDAVConfig | null
  onWebDAVConfigChange?: (config: WebDAVConfig | null) => void
  aiConfig?: AIConfig | null
  onAIConfigChange?: (config: AIConfig | null) => void
}

export function SettingsPage({ bgKey, onPresetChange, resetKey = 0, visible = true, webdavConfig, onWebDAVConfigChange, aiConfig, onAIConfigChange }: SettingsPageProps) {
  const [settingView, setSettingView] = useState<string | null>(null)
  const [subPhase, setSubPhase] = useState<'idle' | 'push-out' | 'push-in' | 'pop-out' | 'pop-in'>('idle')
  const subRef = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(subRef.current), [])
  useEffect(() => { setSettingView(null); setSubPhase('idle') }, [resetKey])

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

  const { theme: uiTheme, setTheme: setUiTheme } = useTheme()

  const pushDetail = (id: string) => {
    if (subPhase !== 'idle') return
    setSubPhase('push-out')
    clearTimeout(subRef.current)
    subRef.current = setTimeout(() => {
      setSettingView(id)
      requestAnimationFrame(() => setSubPhase('push-in'))
      subRef.current = setTimeout(() => setSubPhase('idle'), 400)
    }, 400)
  }

  const popDetail = () => {
    if (subPhase !== 'idle') return
    setSubPhase('pop-out')
    clearTimeout(subRef.current)
    subRef.current = setTimeout(() => {
      setSettingView(null)
      requestAnimationFrame(() => setSubPhase('pop-in'))
      subRef.current = setTimeout(() => setSubPhase('idle'), 400)
    }, 400)
  }

  // Compute container class names
  const listHidden = subPhase === 'idle' && settingView !== null
  const listVisible = subPhase === 'pop-in' || (subPhase === 'idle' && settingView === null)
  const listNoPointer = !(visible && subPhase === 'idle' && settingView === null)

  const subViewHidden = subPhase === 'idle' && settingView === null
  const subViewVisible = subPhase === 'push-in' || (subPhase === 'idle' && settingView !== null)
  const subNoPointer = !(subPhase === 'idle' && settingView !== null)

  const listClass = [
    'settings-container',
    listHidden ? 'hidden' : '',
    listVisible ? 'visible' : 'invisible',
    listNoPointer ? 'no-pointer' : '',
  ].filter(Boolean).join(' ')

  const subViewClass = [
    'settings-sub-view',
    subViewHidden ? 'hidden' : '',
    subViewVisible ? 'visible' : 'exiting',
    subNoPointer ? 'no-pointer' : '',
  ].filter(Boolean).join(' ')

  const subViewTitle = settingView === 'bgPreset' ? '首页背景'
    : settingView === 'readingGoal' ? '阅读目标'
    : settingView === 'webdav' ? 'WebDAV 同步'
    : settingView === 'ai' ? 'AI 助手'
    : settingView === 'startup' ? '启动行为'
    : settingView === 'mediaKey' ? '媒体键翻页'
    : settingView === 'theme' ? '界面风格' : ''

  return (
    <>
      {/* list view */}
      <div className={listClass}>
        <p className="settings-title">设置</p>
        {[
          { id: 'bgPreset', label: '首页背景', summary: getPresets(uiTheme).find((b) => b.key === bgKey)?.label || '' },
          { id: 'readingGoal', label: '阅读目标', summary: goalMinutes > 0 ? `${goalMinutes} 分钟/天` : '未设置' },
          { id: 'webdav', label: 'WebDAV 同步', summary: webdavConfig ? `已配置 (${webdavConfig.url})` : '' },
          { id: 'ai', label: 'AI 助手', summary: aiConfig ? `已配置 (${aiConfig.model})` : '' },
          { id: 'startup', label: '启动行为', summary: startupBehavior === 'resume' ? '继续阅读' : '显示书架' },
          { id: 'mediaKey', label: '媒体键翻页', summary: enableMediaKey ? '已启用' : '已禁用' },
          { id: 'theme', label: '界面风格', summary: uiTheme === 'glass' ? '毛玻璃' : '扁平' },
        ].map((item) => (
          <div key={item.id} className="setting-item" onClick={() => pushDetail(item.id)}>
            <div>
              <div className="setting-label">{item.label}</div>
              {item.summary && <div className="setting-value">{item.summary}</div>}
            </div>
            <span className="setting-arrow">›</span>
          </div>
        ))}
      </div>

      {/* detail view */}
      <div className={subViewClass}>
        {/* Back button - shared */}
        <div className="settings-back-btn" onClick={popDetail}>
          <span className="settings-back-arrow">‹</span>
          <p className="settings-sub-title">{subViewTitle}</p>
        </div>

        {settingView === 'bgPreset' && (
          <div className="settings-sub-content">
            <div className="bg-preset-grid">
              {getPresets(uiTheme).map((p) => (
                <button
                  key={p.key}
                  className={`bg-preset-item ${bgKey === p.key ? 'active' : ''}`}
                  onClick={() => { saveSetting(uiTheme === 'flat' ? 'bgPreset-flat' : 'bgPreset', p.key); onPresetChange(p.key, p.gradient) }}
                >
                  <div className="bg-preset-preview" style={{ background: p.gradient }}>
                    {bgKey === p.key && <span className="bg-preset-check">✓</span>}
                  </div>
                  <div className="bg-preset-name">{p.label}</div>
                </button>
              ))}
            </div>
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
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                选择后立即生效，无需重启
              </div>
            </div>

            <div
              className={`radio-option ${uiTheme === 'glass' ? 'selected' : ''}`}
              onClick={() => setUiTheme('glass')}
              style={{ marginBottom: 10 }}
            >
              <input
                type="radio"
                className="radio-input"
                checked={uiTheme === 'glass'}
                onChange={() => setUiTheme('glass')}
              />
              <div>
                <div className="radio-label">毛玻璃</div>
                <div className="radio-desc">玻璃质感，卡片式布局</div>
              </div>
            </div>

            <div
              className={`radio-option ${uiTheme === 'flat' ? 'selected' : ''}`}
              onClick={() => setUiTheme('flat')}
            >
              <input
                type="radio"
                className="radio-input"
                checked={uiTheme === 'flat'}
                onChange={() => setUiTheme('flat')}
              />
              <div>
                <div className="radio-label">极简扁平</div>
                <div className="radio-desc">简洁干净，扁平化设计</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}