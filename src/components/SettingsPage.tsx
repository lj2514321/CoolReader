import { useState, useRef, useEffect } from 'react'
import { bgPresets } from '../utils/styles'
import { saveSetting } from '../utils/db'
import { SyncSettings } from './SyncSettings'
import { AISettings } from './AISettings'
import type { WebDAVConfig, AIConfig } from '../types'
import type { CSSProperties } from 'react'

const settingItem: CSSProperties = {
  borderRadius: 14,
  background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.08) 100%)',
  border: '1px solid rgba(168,85,247,0.12)',
  padding: '16px 20px',
  marginBottom: 12,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  cursor: 'pointer',
  transition: 'background 0.15s',
}

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
  return (
    <>
      {/* list view */}
      <div style={{
        position: 'absolute', inset: 0, overflowY: 'auto', padding: '28px 36px 32px 24px',
        display: (subPhase !== 'idle' || settingView === null) ? '' : 'none',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        opacity: subPhase === 'pop-in' || (subPhase === 'idle' && settingView === null) ? 1 : 0,
        transform: subPhase === 'pop-in' || (subPhase === 'idle' && settingView === null) ? 'translateY(0)' : 'translateY(24px)',
        pointerEvents: visible && subPhase === 'idle' && settingView === null ? 'auto' : 'none',
      }}>
        <p style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '0 0 24px', letterSpacing: -0.3 }}>设置</p>
        {[
          { id: 'bgPreset', label: '首页背景', summary: bgPresets.find((b) => b.key === bgKey)?.label || '' },
          { id: 'webdav', label: 'WebDAV 同步', summary: webdavConfig ? `已配置 (${webdavConfig.url})` : '' },
          { id: 'ai', label: 'AI 助手', summary: aiConfig ? `已配置 (${aiConfig.model})` : '' },
        ].map((item) => (
          <div key={item.id} onClick={() => pushDetail(item.id)}
            style={settingItem}
            onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(168,85,247,0.14) 100%)'}
            onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.08) 100%)'}
          >
            <div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{item.label}</div>
              {item.summary && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 }}>{item.summary}</div>}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 16 }}>›</span>
          </div>
        ))}
      </div>

      {/* detail view */}
      <div style={{
        position: 'absolute', inset: 0, overflowY: 'auto', padding: '28px 36px 32px 24px',
        display: (subPhase !== 'idle' || settingView !== null) ? '' : 'none',
        transition: 'all 0.4s ease',
        opacity: subPhase !== 'pop-in' && (subPhase !== 'idle' || settingView !== null) ? 1 : 0,
        transform: (subPhase === 'idle' && settingView !== null) || subPhase === 'push-in' ? 'translateX(0)' : 'translateX(100%)',
        pointerEvents: subPhase === 'idle' && settingView !== null ? 'auto' : 'none',
      }}>
        {/* Back button - shared */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, cursor: 'pointer' }} onClick={popDetail}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, padding: '4px 8px 4px 0', transition: 'color 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
          >‹</span>
          <p style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: -0.3, pointerEvents: 'none' }}>
            {settingView === 'bgPreset' ? '首页背景' : settingView === 'webdav' ? 'WebDAV 同步' : settingView === 'ai' ? 'AI 助手' : ''}
          </p>
        </div>

        {settingView === 'bgPreset' && (
          <div style={{
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.08) 100%)',
            border: '1px solid rgba(168,85,247,0.12)',
            padding: '24px 28px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {bgPresets.map((p) => (
                <button key={p.key} onClick={() => { saveSetting('bgPreset', p.key); onPresetChange(p.key, p.gradient) }}
                  style={{
                    cursor: 'pointer', border: bgKey === p.key ? '2px solid rgba(168,85,247,0.7)' : '2px solid transparent',
                    borderRadius: 12, overflow: 'hidden', padding: 0,
                    transition: 'border-color 0.15s',
                    background: 'none',
                  }}
                >
                  <div style={{
                    height: 54, background: p.gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {bgKey === p.key && <span style={{ fontSize: 20, filter: 'invert(1) brightness(2)' }}>✓</span>}
                  </div>
                  <div style={{
                    padding: '6px 0', fontSize: 11, color: 'rgba(255,255,255,0.45)',
                    background: 'rgba(255,255,255,0.03)', textAlign: 'center',
                  }}>{p.label}</div>
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
      </div>
    </>
  )
}
