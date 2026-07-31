import { useState, useCallback, useRef, useEffect } from 'react'
import type { WebDAVConfig, SyncResult, SyncProgressEvent } from '../types'
import { saveWebDAVConfig, loadAllBooks, loadAllProgress, loadReadingTime } from '../utils/db'
import '../styles/components/settings-form.css'

interface SyncSettingsProps {
  config: WebDAVConfig | null
  onConfigChange: (config: WebDAVConfig | null) => void
}

export function SyncSettings({ config, onConfigChange }: SyncSettingsProps) {
  const [url, setUrl] = useState(config?.url || '')
  const [username, setUsername] = useState(config?.username || '')
  const [password, setPassword] = useState(config?.password || '')
  const [path, setPath] = useState(config?.path || '/CoolReader')
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<SyncProgressEvent | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [saved, setSaved] = useState(false)
  const cleanRef = useRef<(() => void) | null>(null)

  // Sync local state when config prop changes (e.g. loaded from DB)
  useEffect(() => {
    if (config) {
      setUrl(config.url)
      setUsername(config.username)
      setPassword(config.password)
      setPath(config.path)
    }
  }, [config])

  // Cleanup progress listener on unmount
  useEffect(() => {
    return () => cleanRef.current?.()
  }, [])

  const handleTest = useCallback(async () => {
    setTesting(true)
    setTestMsg(null)
    try {
      const res = await window.electronAPI?.webdavTestConn({ url, username, password, path })
      setTestMsg(res?.success ? { ok: true, text: '连接成功' } : { ok: false, text: res?.errors?.[0] || '连接失败' })
    } catch (err: unknown) {
      setTestMsg({ ok: false, text: err instanceof Error ? err.message : String(err) })
    }
    setTesting(false)
  }, [url, username, password, path])

  const handleSave = useCallback(async () => {
    const cfg: WebDAVConfig = { url, username, password, path }
    await saveWebDAVConfig(cfg)
    onConfigChange(cfg)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [url, username, password, path, onConfigChange])

  const handleSync = useCallback(async () => {
    if (!window.electronAPI) return
    setSyncing(true)
    setSyncResult(null)
    setSyncProgress(null)

    // Register progress listener
    const clean = window.electronAPI.onSyncProgress((data: SyncProgressEvent) => {
      setSyncProgress(data)
    })
    cleanRef.current = clean

    try {
      const localBooks = await loadAllBooks()
      const localProgress = await loadAllProgress()
      const today = new Date().toISOString().slice(0, 10)
      const todaySeconds = await loadReadingTime(today)
      const localReadingTime = todaySeconds

      const result = await window.electronAPI.webdavSyncAll(
        { url, username, password, path },
        localBooks,
        localProgress,
        localReadingTime,
      )
      setSyncResult(result)
    } catch (err: unknown) {
      setSyncResult({ success: false, uploaded: 0, downloaded: 0, conflicts: 0, errors: [err instanceof Error ? err.message : String(err)] })
    }
    setSyncing(false)
    cleanRef.current?.()
  }, [url, username, password, path])

  return (
    <div>
      {/* Connection form */}
      <div className="form-container" style={{ marginBottom: 16 }}>
        <label className="form-label" htmlFor="webdav-url">服务器地址</label>
        <input id="webdav-url" className="form-input" type="url" autoComplete="url" placeholder="https://example.com/dav/" value={url} onChange={e => setUrl(e.target.value)} />

        <label className="form-label" htmlFor="webdav-username">用户名</label>
        <input id="webdav-username" className="form-input" autoComplete="username" placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />

        <label className="form-label" htmlFor="webdav-password">密码</label>
        <input id="webdav-password" className="form-input" type="password" autoComplete="current-password" placeholder="password" value={password} onChange={e => setPassword(e.target.value)} />

        <label className="form-label" htmlFor="webdav-path">同步路径</label>
        <input id="webdav-path" className="form-input" placeholder="/CoolReader" value={path} onChange={e => setPath(e.target.value)} />

        <div className="form-actions">
          <button onClick={handleTest} disabled={testing || !url}
            className="form-btn"
          >{testing ? '测试中...' : '测试连接'}</button>

          <button onClick={handleSave}
            className="form-btn"
          >{saved ? '已保存' : '保存配置'}</button>

          {testMsg && (
            <span role="status" className={`form-helper form-status ${testMsg.ok ? 'success' : 'error'}`}>
              {testMsg.text}
            </span>
          )}
        </div>
      </div>

      {/* Sync section */}
      <div className="form-container">
        <div className="form-section">
          <span className="form-section-title">同步</span>
          <button onClick={handleSync} disabled={syncing || !url || (!saved && !config)}
            className="form-btn primary" style={{ background: syncing ? 'rgba(255,255,255,0.1)' : undefined }}
          >{syncing ? '同步中...' : '立即同步'}</button>
        </div>

        {/* Progress bar */}
        {syncProgress && (
          <div className="form-progress">
            <div className="form-progress-meta">
              <span>{syncProgress.message}</span>
              {syncProgress.total && syncProgress.current !== undefined && (
                <span>{syncProgress.current}/{syncProgress.total}</span>
              )}
            </div>
            {syncProgress.total && syncProgress.current !== undefined && (
              <div className="form-progress-track" role="progressbar" aria-label="同步进度" aria-valuemin={0} aria-valuemax={syncProgress.total} aria-valuenow={syncProgress.current}>
                <div className="form-progress-fill" style={{
                  width: `${Math.min(100, (syncProgress.current / syncProgress.total) * 100)}%`,
                }} />
              </div>
            )}
          </div>
        )}

        {/* Sync result */}
        {syncResult && (
          <div className={`form-result ${syncResult.success ? '' : 'error'}`}>
            <div>上传: {syncResult.uploaded} 本 | 下载: {syncResult.downloaded} 本 | 冲突: {syncResult.conflicts}</div>
            {syncResult.errors.length > 0 && (
              <div className="form-result-errors">
                {syncResult.errors.map((e, i) => <div key={i}>- {e}</div>)}
              </div>
            )}
            {syncResult.success && syncResult.errors.length === 0 && (
              <div style={{ marginTop: 6, color: 'rgba(74,222,128,0.8)' }}>同步完成</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
