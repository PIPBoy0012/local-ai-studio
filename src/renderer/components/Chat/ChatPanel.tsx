import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { AppSettings, ChatMessage, OllamaModel } from '@shared/types'
import { formatMarkdown } from './formatMarkdown'

interface Props {
  settings: AppSettings
  onSettingsChange: (s: Partial<AppSettings>) => void
}

function genId(): string {
  return Math.random().toString(36).slice(2)
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ChatPanel({ settings, onSettingsChange }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [models, setModels] = useState<OllamaModel[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const loadModels = useCallback(async () => {
    try {
      setError(null)
      const data = await window.electronAPI.listModels()
      setModels(data.models ?? [])
      if (!settings.selectedModel && data.models?.length > 0) {
        onSettingsChange({ selectedModel: data.models[0].name })
      }
    } catch {
      setError('Cannot reach Ollama. Make sure it is running at ' + settings.ollamaUrl)
    }
  }, [onSettingsChange, settings.ollamaUrl, settings.selectedModel])

  // Load models on mount and when Ollama URL changes
  useEffect(() => {
    loadModels()
  }, [loadModels])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming || !settings.selectedModel) return

    const userMsg: ChatMessage = {
      id: genId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }

    const chatId = genId()
    setCurrentChatId(chatId)
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)
    setIsStreaming(true)
    setError(null)

    // Resize textarea back
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Create placeholder for assistant message
    const assistantId = genId()
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model: settings.selectedModel,
    }
    setMessages((prev) => [...prev, assistantMsg])

    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }))

    // Subscribe to streaming chunks
    const unsubscribe = window.electronAPI.onStream(chatId, (data: unknown) => {
      const chunk = data as {
        done?: boolean
        message?: { content?: string }
        error?: string
      }

      if (chunk.error) {
        setError(chunk.error)
        setIsLoading(false)
        setIsStreaming(false)
        unsubscribe()
        return
      }

      if (chunk.done) {
        setIsLoading(false)
        setIsStreaming(false)
        unsubscribe()
        return
      }

      if (chunk.message?.content) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content + chunk.message!.content! }
              : m,
          ),
        )
        setIsLoading(false)
      }
    })

    try {
      await window.electronAPI.chat({
        chatId,
        model: settings.selectedModel,
        messages: history,
        ollamaUrl: settings.ollamaUrl,
      })
    } catch (err) {
      setError((err as Error).message)
      setIsLoading(false)
      setIsStreaming(false)
      unsubscribe()
    }
  }, [input, isStreaming, messages, settings])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleAbort = () => {
    if (currentChatId) {
      window.electronAPI.abortChat(currentChatId)
    }
  }

  const handleClearChat = () => {
    setMessages([])
    setError(null)
  }

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px'
  }

  return (
    <div className="chat-panel">
      {/* Toolbar */}
      <div className="chat-toolbar">
        <label htmlFor="model-select">Model:</label>
        <select
          id="model-select"
          className="select"
          value={settings.selectedModel}
          onChange={(e) => onSettingsChange({ selectedModel: e.target.value })}
        >
          {models.length === 0 && (
            <option value="">No models found</option>
          )}
          {models.map((m) => (
            <option key={m.name} value={m.name}>{m.name}</option>
          ))}
        </select>
        <button className="btn btn-ghost" onClick={loadModels} title="Refresh models">
          ↺ Refresh
        </button>
        {messages.length > 0 && (
          <button className="btn btn-ghost" onClick={handleClearChat}>
            🗑 Clear
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            padding: '10px 20px',
            background: 'rgba(244,67,54,0.12)',
            borderBottom: '1px solid rgba(244,67,54,0.3)',
            color: '#ef9a9a',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          ⚠️ {error}
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: '2px 8px', marginLeft: 'auto' }}
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <span style={{ fontSize: 48 }}>🤖</span>
            <h2>Local AI Studio</h2>
            <p>
              Chat with your local AI models via Ollama. Select a model above and start
              typing below.
            </p>
            {models.length === 0 && (
              <p style={{ color: 'var(--color-warning)' }}>
                ⚠️ No models detected. Install Ollama and pull a model first, e.g.{' '}
                <code
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  ollama pull codellama
                </code>
              </p>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div>
                <div
                  className="message-bubble selectable"
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                />
                <div className="message-meta">
                  {msg.model && <span>{msg.model} · </span>}
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="message assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-bubble">
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="chat-input-area">
        <div className="chat-input-row">
          <textarea
            ref={textareaRef}
            className="textarea"
            placeholder={
              settings.selectedModel
                ? `Message ${settings.selectedModel}… (Enter to send, Shift+Enter for newline)`
                : 'Select a model to start chatting'
            }
            value={input}
            onChange={autoResize}
            onKeyDown={handleKeyDown}
            disabled={!settings.selectedModel}
            rows={1}
          />
          {isStreaming ? (
            <button className="btn btn-secondary" onClick={handleAbort}>
              ⏹ Stop
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={sendMessage}
              disabled={!input.trim() || !settings.selectedModel}
            >
              Send ↵
            </button>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          Running locally via Ollama · No data leaves your machine
        </div>
      </div>
    </div>
  )
}
