import { useState, useRef, useEffect } from 'react'
import LeadPanel from './LeadPanel.jsx'

function Bubble({ role, text }) {
  const isAgent = role === 'assistant' || role === 'agent'
  return (
    <div className={`flex ${isAgent ? 'justify-start' : 'justify-end'} mb-2 px-3`}>
      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
        isAgent
          ? 'bg-stone-100 text-stone-800 rounded-tl-sm'
          : 'bg-green-700 text-white rounded-tr-sm'
      }`}>
        {text}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-2 px-3">
      <div className="bg-stone-100 rounded-2xl rounded-tl-sm px-3.5 py-3 flex gap-1 items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '160ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '320ms' }} />
      </div>
    </div>
  )
}

export default function Chat({ onReset }) {
  const chatId = useRef(crypto.randomUUID()).current
  const completedRef = useRef(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const [opening, setOpening] = useState(null)
  const [messages, setMessages] = useState([])
  const [lead, setLead] = useState({})
  const [completed, setCompleted] = useState(false)
  const [banner, setBanner] = useState(null)
  const [typing, setTyping] = useState(false)
  const [inFlight, setInFlight] = useState(false)
  const [input, setInput] = useState('')
  const [errorBubble, setErrorBubble] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const mode = params.get('mode')
    const url = mode ? `/api/opening?mode=${encodeURIComponent(mode)}` : '/api/opening'
    fetch(url)
      .then(r => r.json())
      .then(setOpening)
      .catch(() => setOpening({ type: 'business_hours', message: 'Hi, we missed your call and will get back to you as soon as possible. Can you tell us your name and what is going on?', phone: '(555) 010-4477' }))
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing, banner, errorBubble])

  function buildTranscript(currentMessages) {
    const lines = []
    if (opening) lines.push({ role: 'agent', text: opening.message })
    for (const m of currentMessages) {
      lines.push({ role: m.role === 'user' ? 'customer' : 'agent', text: m.content })
    }
    return lines
  }

  async function completeChat(currentLead, currentMessages, completedBy, agentCompletion) {
    if (completedRef.current) return
    completedRef.current = true

    try {
      const r = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          lead: currentLead,
          transcript: buildTranscript(currentMessages),
          completedBy,
          summary: agentCompletion?.summary,
          reason: agentCompletion?.reason,
        }),
      })
      const data = await r.json()
      if (data.ok) {
        setBanner({ ok: true, missingFields: agentCompletion?.missingFields || [] })
      } else {
        setBanner({ ok: false, error: data.error || 'Could not write to sheet.' })
      }
    } catch (err) {
      setBanner({ ok: false, error: err.message })
    }

    setCompleted(true)
  }

  async function send(text) {
    const trimmed = text.trim()
    if (!trimmed || inFlight || completed) return

    setInput('')
    setErrorBubble(null)
    setInFlight(true)

    const prevMessages = messages
    const userMsg = { role: 'user', content: trimmed }
    const updatedMsgs = [...prevMessages, userMsg]
    setMessages(updatedMsgs)
    setTyping(true)

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMsgs,
          lead,
          openingType: opening?.type || 'business_hours',
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Request failed')

      const { reply, lead: newLead, completion } = data
      const finalLead = newLead || lead
      const withReply = [...updatedMsgs, { role: 'assistant', content: reply }]

      setTyping(false)
      setMessages(withReply)
      setLead(finalLead)

      if (completion) {
        await completeChat(finalLead, withReply, 'agent', completion)
      }
    } catch (err) {
      setTyping(false)
      setMessages(prevMessages)
      setErrorBubble({ text: err.message, retryText: trimmed })
    } finally {
      setInFlight(false)
    }
  }

  async function handleMarkComplete() {
    if (completedRef.current || inFlight || !messages.some(m => m.role === 'user')) return
    setInFlight(true)
    await completeChat(lead, messages, 'manual', null)
    setInFlight(false)
  }

  const phone = opening?.phone || '(555) 010-4477'
  const customerHasSent = messages.some(m => m.role === 'user')

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-3xl">
      {/* Phone panel */}
      <div className="w-full lg:w-[420px] flex-shrink-0">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col h-[600px]">
          {/* Chat header */}
          <div className="bg-green-800 px-4 py-3 flex-shrink-0">
            <p className="text-white font-semibold text-sm">Tri-Valley Tree Care</p>
            <p className="text-green-200 text-xs mt-0.5">Missed call from {phone}</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-3 space-y-0.5">
            {opening && <Bubble role="agent" text={opening.message} />}

            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.content} />
            ))}

            {typing && <TypingIndicator />}

            {errorBubble && (
              <div className="mx-3 my-2 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {errorBubble.text}{' '}
                <button
                  className="underline font-semibold"
                  onClick={() => { setErrorBubble(null); send(errorBubble.retryText) }}
                >
                  Retry
                </button>
              </div>
            )}

            {banner && (
              <div className={`mx-3 my-2 px-3.5 py-2.5 rounded-xl text-xs ${
                banner.ok
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {banner.ok ? (
                  <>
                    <p className="font-semibold">Chat complete. Lead sent to the owner's sheet.</p>
                    {banner.missingFields?.length > 0 && (
                      <p className="mt-1">Missing: {banner.missingFields.join(', ')}</p>
                    )}
                  </>
                ) : (
                  <p>{banner.error}</p>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-stone-200 px-3 pt-2.5 pb-3 flex-shrink-0 bg-white">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(input) } }}
                disabled={completed || inFlight}
                placeholder={completed ? 'Chat ended' : 'Type a message...'}
                className="flex-1 rounded-full border border-stone-300 px-4 py-2 text-sm focus:outline-none focus:border-green-500 disabled:bg-stone-50 disabled:text-stone-400 disabled:cursor-not-allowed"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || inFlight || completed}
                className="bg-green-700 text-white rounded-full px-4 py-2 text-sm font-medium hover:bg-green-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>

            <div className="mt-2 flex justify-center">
              {completed ? (
                <button
                  onClick={onReset}
                  className="w-full py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-xs font-medium transition-colors"
                >
                  Start new chat
                </button>
              ) : (
                <button
                  onClick={handleMarkComplete}
                  disabled={inFlight || !customerHasSent}
                  className="text-xs text-stone-400 hover:text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Mark complete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lead panel */}
      <div className="flex-1 min-w-0">
        <LeadPanel lead={lead} />
      </div>
    </div>
  )
}
