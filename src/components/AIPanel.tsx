import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import type { AIConfig, AIChatMessage } from '../types'

const _pulseId = '_ai_pulse'
if (typeof document !== 'undefined' && !document.getElementById(_pulseId)) {
  const s = document.createElement('style')
  s.id = _pulseId
  s.textContent = '@keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}'
  document.head.appendChild(s)
}

interface AIPanelProps {
  visible: boolean
  onClose: () => void
  config: AIConfig | null
  theme: 'light' | 'dark' | 'sepia'
  onGetChapterText: () => Promise<string>
  onGetFullBookText: () => Promise<string>
}

const themeBg: Record<string, string> = {
  light: '#ece8f4',
  sepia: '#f4ecd8',
  dark: '#0f0c29',
}

const ChatMessageItem = memo(function ChatMessageItem({ msg, fg, dark }: { msg: AIChatMessage; fg: string; dark: boolean }) {
  return (
    <div style={{
      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
      maxWidth: '85%',
      padding: '10px 14px',
      borderRadius: 12,
      fontSize: 13,
      lineHeight: 1.5,
      color: fg,
      background: msg.role === 'user'
        ? 'rgba(99,102,241,0.15)'
        : (dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
      whiteSpace: 'pre-wrap',
    }}>
      {msg.content}
    </div>
  )
})

export function AIPanel({ visible, onClose, config, theme, onGetChapterText, onGetFullBookText }: AIPanelProps) {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    { role: 'system', content: '你是一个智能阅读助手，帮助用户理解书籍内容。回答简洁、准确。' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [panelHeight, setPanelHeight] = useState(35)
  const msgEndRef = useRef<HTMLDivElement>(null)
  const cleanRef = useRef<(() => void) | null>(null)
  const dragRef = useRef({ dragging: false, startY: 0, startH: 35 })

  const dark = theme === 'dark'
  const fg = dark ? '#c8c8e0' : '#2d2b55'
  const muted = dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'
  const glassStyle = useMemo(() => ({
    background: dark ? 'rgba(15,12,41,0.85)' : 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(20px) saturate(140%)',
    WebkitBackdropFilter: 'blur(20px) saturate(140%)',
    borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
  }), [dark])

  useEffect(() => {
    return () => cleanRef.current?.()
  }, [])

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const addMessage = useCallback((msg: AIChatMessage) => {
    setMessages(prev => [...prev, msg])
  }, [])

  const handleSummary = useCallback(async () => {
    if (!config || loading) return
    setLoading(true)
    setStreamingText('')

    const chapterText = await onGetChapterText()
    if (!chapterText) {
      addMessage({ role: 'assistant', content: '无法获取当前章节内容。' })
      setLoading(false)
      return
    }

    const summaryMsg: AIChatMessage = { role: 'user', content: `请用中文总结以下章节内容，列出关键要点：\n\n${chapterText}` }
    addMessage(summaryMsg)

    // Streaming — clean previous listener first
    cleanRef.current?.()
    const clean = window.electronAPI!.onAIToken((token: string) => {
      setStreamingText(prev => prev + token)
    })
    cleanRef.current = clean

    try {
      const full = await window.electronAPI!.aiStream(config, [...messages, summaryMsg])
      addMessage({ role: 'assistant', content: full })
      setStreamingText('')
    } catch (err: any) {
      addMessage({ role: 'assistant', content: `错误: ${err.message}` })
      setStreamingText('')
    }
    setLoading(false)
    cleanRef.current?.()
  }, [config, loading, onGetChapterText, messages, addMessage])

  const handleSend = useCallback(async () => {
    if (!input.trim() || !config || loading) return
    const userMsg: AIChatMessage = { role: 'user', content: input }
    setInput('')
    addMessage(userMsg)
    setLoading(true)
    setStreamingText('')

    // Include book context
    const chapterText = await onGetChapterText()
    const contextMsg: AIChatMessage = chapterText
      ? { role: 'user', content: `以下是我正在阅读的章节内容（供参考，无需直接回复此内容）：\n${chapterText}` }
      : { role: 'user', content: '（无当前章节内容）' }

    cleanRef.current?.()
    const clean = window.electronAPI!.onAIToken((token: string) => {
      setStreamingText(prev => prev + token)
    })
    cleanRef.current = clean

    try {
      const full = await window.electronAPI!.aiStream(config, [...messages, contextMsg, userMsg])
      addMessage({ role: 'assistant', content: full })
      setStreamingText('')
    } catch (err: any) {
      addMessage({ role: 'assistant', content: `错误: ${err.message}` })
      setStreamingText('')
    }
    setLoading(false)
    cleanRef.current?.()
  }, [input, config, loading, onGetChapterText, messages, addMessage])

  const displayMessages = useMemo(() => messages.filter(m => m.role !== 'system'), [messages])

  // drag-to-resize handlers
  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragRef.current = { dragging: true, startY: e.clientY, startH: panelHeight }
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current.dragging) return
      const delta = dragRef.current.startY - ev.clientY
      const newH = Math.max(20, Math.min(80, dragRef.current.startH + delta / window.innerHeight * 100))
      setPanelHeight(Math.round(newH))
    }
    const onUp = () => { dragRef.current.dragging = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [panelHeight])

  return (
    <>
      {/* Panel */}
      {visible && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${panelHeight}vh`, zIndex: 10,
          display: 'flex', flexDirection: 'column',
          ...glassStyle,
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s ease',
        }}>
          {/* drag handle */}
          <div onMouseDown={onDragStart} style={{
            height: 6, cursor: 'ns-resize', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          }}>
            <div style={{ width: 36, height: 3, borderRadius: 2, background: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />
          </div>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          }}>
            <span style={{ color: fg, fontSize: 14, fontWeight: 700 }}>AI 助手</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {!config && (
                <span style={{ color: 'rgba(248,113,113,0.8)', fontSize: 11 }}>未配置 API</span>
              )}
              <button onClick={handleSummary} disabled={loading || !config}
                style={{
                  border: 'none', borderRadius: 8, padding: '6px 14px',
                  fontSize: 12, fontWeight: 600, cursor: loading || !config ? 'default' : 'pointer',
                  background: 'rgba(99,102,241,0.25)', color: fg,
                  opacity: loading || !config ? 0.4 : 1,
                }}
              >总结本章</button>
              <button onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: 18, padding: '0 4px' }}
              >✕</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '12px 16px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {displayMessages.length === 0 && !loading && (
              <div style={{ color: muted, fontSize: 13, textAlign: 'center', marginTop: 24 }}>
                点击「总结本章」总结当前章节，或在下方输入问题提问。
              </div>
            )}
            {displayMessages.map((msg, i) => (
              <ChatMessageItem key={i} msg={msg} fg={fg} dark={dark} />
            ))}
            {streamingText && (
              <div style={{
                alignSelf: 'flex-start',
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: 12,
                fontSize: 13,
                lineHeight: 1.5,
                color: fg,
                background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                whiteSpace: 'pre-wrap',
              }}>
                {streamingText}
                <span style={{ animation: 'pulse 1s infinite', opacity: 0.5 }}>▍</span>
              </div>
            )}
            {loading && !streamingText && (
              <div style={{
                alignSelf: 'flex-start', padding: '10px 14px',
                color: muted, fontSize: 13,
              }}>
                <span style={{ opacity: 0.5 }}>思考中...</span>
              </div>
            )}
            <div ref={msgEndRef} />
          </div>

          {/* Input */}
          <div style={{
            display: 'flex', gap: 8, padding: '10px 16px',
            borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="问任何关于本书的问题..."
              disabled={loading || !config}
              style={{
                flex: 1,
                background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                border: '1px solid transparent',
                borderRadius: 10, padding: '10px 14px',
                color: fg, fontSize: 13, outline: 'none',
              }}
            />
            <button onClick={handleSend} disabled={!input.trim() || loading || !config}
              style={{
                border: 'none', borderRadius: 10, padding: '10px 18px',
                fontSize: 13, fontWeight: 600, cursor: loading || !config || !input.trim() ? 'default' : 'pointer',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: '#fff',
                opacity: loading || !config || !input.trim() ? 0.5 : 1,
              }}
            >发送</button>
          </div>
        </div>
      )}
    </>
  )
}
