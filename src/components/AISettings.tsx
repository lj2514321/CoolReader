import { useState, useCallback } from 'react'
import type { AIConfig } from '../types'
import { saveAIConfig } from '../utils/db'
import '../styles/components/settings-form.css'

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
    } catch (err: unknown) {
      setTestMsg({ ok: false, text: err instanceof Error ? err.message : String(err) })
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
    <div className="form-container">
      <label className="form-label">API 地址</label>
      <input className="form-input" placeholder="https://api.openai.com/v1" value={apiUrl} onChange={e => setApiUrl(e.target.value)} />

      <label className="form-label">API Key</label>
      <input className="form-input" type="password" placeholder="sk-..." value={apiKey} onChange={e => setApiKey(e.target.value)} />

      <label className="form-label">模型</label>
      <input className="form-input" placeholder="gpt-4o-mini" value={model} onChange={e => setModel(e.target.value)} />

      <div className="form-actions">
        <button onClick={handleTest} disabled={testing || !apiUrl || !apiKey}
          className="form-btn" style={{ background: 'rgba(45,90,90,0.3)' }}
        >{testing ? '测试中...' : '测试连接'}</button>

        <button onClick={handleSave}
          className="form-btn" style={{ background: 'rgba(45,90,90,0.3)' }}
        >{saved ? '已保存' : '保存配置'}</button>

        {testMsg && (
          <span className={`form-helper form-status ${testMsg.ok ? 'success' : 'error'}`}>
            {testMsg.text}
          </span>
        )}
      </div>
    </div>
  )
}
