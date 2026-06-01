import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import type { AIConfig, AIChatMessage } from '../types'
import { getElectronAPI } from '../utils/electronAPI'
import '../styles/components/ai-panel.css'

interface AIPanelProps {
  visible: boolean
  onClose: () => void
  config: AIConfig | null
  theme: 'light' | 'dark' | 'sepia'
  onGetChapterText: () => Promise<string>
  onGetFullBookText: () => Promise<string>
}

const ChatMessageItem = memo(function ChatMessageItem({ msg }: { msg: AIChatMessage }) {
  return (
    <div className={msg.role === 'user' ? 'ai-message-user' : 'ai-message-assistant'}>
      {msg.content}
    </div>
  )
})

async function streamAIResponse(
  config: AIConfig,
  messages: AIChatMessage[],
  onToken: (token: string) => void,
  onComplete: (full: string) => void,
  onError: (err: Error) => void,
  cleanRef: React.MutableRefObject<(() => void) | null>
): Promise<void> {
  const electronAPI = getElectronAPI()
  if (!electronAPI) {
    onError(new Error('electronAPI not available — not running in Electron'))
    return
  }
  cleanRef.current?.()
  const clean = electronAPI.onAIToken(onToken)
  cleanRef.current = clean

  try {
    const full = await electronAPI.aiStream(config, messages)
    onComplete(full)
  } catch (err: unknown) {
    onError(err instanceof Error ? err : new Error(String(err)))
  }

  cleanRef.current?.()
}

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

    await streamAIResponse(
      config,
      [...messages, summaryMsg],
      token => setStreamingText(prev => prev + token),
      full => { addMessage({ role: 'assistant', content: full }); setStreamingText('') },
      err => { addMessage({ role: 'assistant', content: `错误: ${err.message}` }); setStreamingText('') },
      cleanRef
    )
    setLoading(false)
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

    await streamAIResponse(
      config,
      [...messages, contextMsg, userMsg],
      token => setStreamingText(prev => prev + token),
      full => { addMessage({ role: 'assistant', content: full }); setStreamingText('') },
      err => { addMessage({ role: 'assistant', content: `错误: ${err.message}` }); setStreamingText('') },
      cleanRef
    )
    setLoading(false)
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
        // @ts-expect-error 'custom' theme is handled separately, AIPanel maps it to 'light' for rendering
        <div data-theme={theme === 'custom' ? 'light' : theme} className="ai-panel-root" style={{ height: `${panelHeight}vh` }}>
          {/* drag handle */}
          <div onMouseDown={onDragStart} className="ai-drag-handle">
            <div className="ai-drag-handle-bar" />
          </div>
          {/* Header */}
          <div className="ai-header">
            <span className="ai-header-title">AI 助手</span>
            <div className="ai-header-actions">
              {!config && (
                <span className="ai-warning-text">未配置 API</span>
              )}
              <button onClick={handleSummary} disabled={loading || !config}
                className="ai-summary-btn"
              >总结本章</button>
              <button onClick={onClose}
                className="ai-close-btn"
              >✕</button>
            </div>
          </div>

          {/* Messages */}
          <div className="ai-messages">
            {displayMessages.length === 0 && !loading && (
              <div className="ai-empty-state">
                点击「总结本章」总结当前章节，或在下方输入问题提问。
              </div>
            )}
            {displayMessages.map((msg, i) => (
              <ChatMessageItem key={i} msg={msg} />
            ))}
            {streamingText && (
              <div className="ai-message-assistant">
                {streamingText}
                <span className="ai-streaming-cursor">▍</span>
              </div>
            )}
            {loading && !streamingText && (
              <div className="ai-loading">
                <span className="ai-loading-text">思考中...</span>
              </div>
            )}
            <div ref={msgEndRef} />
          </div>

          {/* Input */}
          <div className="ai-input-row">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="问任何关于本书的问题..."
              disabled={loading || !config}
              className="ai-input"
            />
            <button onClick={handleSend} disabled={!input.trim() || loading || !config}
              className="ai-send-btn"
            >发送</button>
          </div>
        </div>
      )}
    </>
  )
}
