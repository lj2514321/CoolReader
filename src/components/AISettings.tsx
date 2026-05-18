import { useState, useCallback } from 'react'
import type { AIConfig } from '../types'
import { saveAIConfig } from '../utils/db'
import type { CSSProperties } from 'react'

const inputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '10px 14px',
  color: '#fff', fontSize: 13, outline: 'none',
  marginTop: 6,
}
const labelStyle: CSSProperties = {
  color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, letterSpacing: 0.3,
  display: 'block', marginTop: 14,
}

interface AISettingsProps {
  config: AIConfig | null
  onConfigChange: (config: AIConfig | null) => void
}

export function AISettings({ config, onConfigChange }: AISettingsProps) {
  const [apiUrl, setApiUrl] = useState(config?.apiUrl || '')
  const [apiKey, setApiKey] = useState(config?.apiKey || '')
  const [model, setModel] = useState(config?.model || 'gpt-4o-mini')
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleTest = useCallback(async () => {
    if (!window.electronAPI) return
    setTesting(true)
    setTestMsg(null)
    try {
      const result = await window.electronAPI.aiChat(
        { apiUrl, apiKey, model },
        [{ role: 'user', content: 'Hello, reply "OK" if you receive this.' }],
      )
      setTestMsg(result ? { ok: true, text: '连接成功: ' + result.slice(0, 60) } : { ok: false, text: '返回为空' })
    } catch (err: any) {
      setTestMsg({ ok: false, text: err?.message || String(err) })
    }
    setTesting(false)
  }, [apiUrl, apiKey, model])

  const handleSave = useCallback(async () => {
    const cfg: AIConfig = { apiUrl, apiKey, model }
    await saveAIConfig(cfg)
    onConfigChange(cfg)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [apiUrl, apiKey, model, onConfigChange])

  return (
    <div style={{
      borderRadius: 14,
      background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.08) 100%)',
      border: '1px solid rgba(168,85,247,0.12)',
      padding: '20px 24px',
    }}>
      <label style={labelStyle}>API 地址</label>
      <input style={inputStyle} placeholder="https://api.openai.com/v1" value={apiUrl} onChange={e => setApiUrl(e.target.value)} />

      <label style={labelStyle}>API Key</label>
      <input style={inputStyle} type="password" placeholder="sk-..." value={apiKey} onChange={e => setApiKey(e.target.value)} />

      <label style={labelStyle}>模型</label>
      <input style={inputStyle} placeholder="gpt-4o-mini" value={model} onChange={e => setModel(e.target.value)} />

      <div style={{ display: 'flex', gap: 10, marginTop: 18, alignItems: 'center' }}>
        <button onClick={handleTest} disabled={testing || !apiUrl || !apiKey}
          style={{
            border: 'none', borderRadius: 10, padding: '10px 20px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: 'rgba(99,102,241,0.3)', color: '#fff',
            opacity: testing || !apiUrl || !apiKey ? 0.5 : 1,
            transition: 'all 0.15s',
          }}
        >{testing ? '测试中...' : '测试连接'}</button>

        <button onClick={handleSave}
          style={{
            border: 'none', borderRadius: 10, padding: '10px 20px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: 'rgba(168,85,247,0.3)', color: '#fff',
            transition: 'all 0.15s',
          }}
        >{saved ? '已保存' : '保存配置'}</button>

        {testMsg && (
          <span style={{ color: testMsg.ok ? 'rgba(74,222,128,0.9)' : 'rgba(248,113,113,0.9)', fontSize: 12, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {testMsg.text}
          </span>
        )}
      </div>
    </div>
  )
}
