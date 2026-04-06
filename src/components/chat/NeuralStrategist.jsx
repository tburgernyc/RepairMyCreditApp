import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore, useUiState, useAnalysisResult } from '../../store'
import { fetchWithRetry } from '../../services/api'
import { useFirebase } from '../../hooks/useFirebase'

function UserBubble({ content }) {
  return (
    <div className="flex justify-end">
      <div
        className="bg-gradient-to-br from-blue-500 to-blue-600 text-white
                   rounded-[1.25rem] rounded-br-md px-4 py-3 max-w-[80%] text-sm leading-relaxed"
      >
        {content}
      </div>
    </div>
  )
}

function AIBubble({ content }) {
  return (
    <div className="flex justify-start">
      <div
        className="glass-surface-sm text-slate-800
                   rounded-[1.25rem] rounded-bl-md px-4 py-3 max-w-[80%] text-sm leading-relaxed"
      >
        {content}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="glass-surface-sm rounded-[1.25rem] rounded-bl-md px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function NeuralStrategist() {
  const { isChatOpen } = useUiState()
  const closeChat = useStore((s) => s.closeChat)
  const { analysisId, certaintyScore, detractors, roadmap } = useAnalysisResult()
  const { getToken } = useFirebase()

  const [messages, setMessages] = useState([
    {
      role: 'model',
      content: 'Hello — I\'m your Neural Strategist. I have full context on your credit audit. Ask me anything about your dispute strategy, Metro 2 rights, or next steps.',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatId, setChatId] = useState(null)

  const inputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const triggerButtonRef = useRef(null)
  const panelRef = useRef(null)

  // Focus management: move focus into panel on open, return on close
  useEffect(() => {
    if (isChatOpen) {
      inputRef.current?.focus()
    }
  }, [isChatOpen])

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus trap inside panel while open
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        closeChat()
        triggerButtonRef.current?.focus()
        return
      }
      if (e.key !== 'Tab') return
      if (!panelRef.current) return

      const focusable = panelRef.current.querySelectorAll(
        'button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    },
    [closeChat]
  )

  const handleSubmit = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setIsLoading(true)

    try {
      const token = await getToken()
      const res = await fetchWithRetry('/api/chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisId,
          message: text,
          chatId,
        }),
      })
      const data = await res.json()
      if (data.chatId) setChatId(data.chatId)
      setMessages((prev) => [...prev, { role: 'model', content: data.reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: 'Sorry, I had trouble connecting. Please try again.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [analysisId, chatId, getToken, input, isLoading])

  const handleInputKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <>
      {/* Backdrop */}
      {isChatOpen && (
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-sm z-40"
          onClick={closeChat}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Neural Strategist Chat"
        aria-hidden={!isChatOpen}
        onKeyDown={handleKeyDown}
        className={`fixed right-0 top-0 h-screen z-50 flex flex-col
                    glass-surface rounded-l-[2rem] shadow-2xl
                    transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                    w-[min(450px,90vw)]
                    ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/40 flex-shrink-0">
          <div>
            <h2 className="text-slate-800 font-semibold">Neural Strategist</h2>
            <p className="text-xs text-slate-500">AI credit dispute advisor</p>
          </div>
          <button
            type="button"
            onClick={closeChat}
            aria-label="Close chat panel"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center
                       rounded-full hover:bg-slate-100 transition-colors
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <svg className="w-5 h-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
          className="flex-1 overflow-y-auto px-6 py-4 space-y-3"
        >
          {messages.map((msg, i) =>
            msg.role === 'user' ? (
              <UserBubble key={i} content={msg.content} />
            ) : (
              <AIBubble key={i} content={msg.content} />
            )
          )}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} aria-hidden="true" />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-white/40 flex-shrink-0">
          <label htmlFor="chat-input" className="sr-only">
            Message Neural Strategist
          </label>
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              id="chat-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Ask about your dispute strategy…"
              disabled={isLoading}
              className="flex-1 surface-inset rounded-2xl px-4 py-3 text-sm text-slate-800
                         placeholder-slate-400 resize-none max-h-32 overflow-y-auto
                         focus:outline-none focus:ring-2 focus:ring-blue-500/50
                         disabled:opacity-50"
              style={{ minHeight: '44px' }}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center
                         bg-gradient-to-r from-blue-600 to-indigo-600 text-white
                         rounded-full shadow-md hover:shadow-lg hover:scale-[1.02]
                         active:scale-95 transition-all duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 pl-1">Enter to send · Shift+Enter for new line</p>
        </div>
      </aside>
    </>
  )
}
