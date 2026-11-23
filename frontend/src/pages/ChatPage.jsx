import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowDown, Copy, Plus, Send, Square, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Shell from '../components/Shell'
import { Button } from '../components/ui'
import api, { streamMessage } from '../lib/api'
import { groupSessions } from '../lib/format'

const prompts = [
  'List the Alcazar features from the brochure',
  'Compare Alcazar vs Creta',
  'Compare Alcazar variants',
  'Should I recommend i20 or Aura?',
  'Compare the engines',
  'Best car for my family',
]

export default function ChatPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [sources, setSources] = useState([])
  const [nearBottom, setNearBottom] = useState(true)
  const listRef = useRef(null)
  const abortRef = useRef(null)

  async function loadSessions() {
    const response = await api.get('/api/chat/sessions')
    setSessions(response.data)
  }

  useEffect(() => { loadSessions().catch(() => toast.error('Conversations could not be loaded.')) }, [])

  useEffect(() => {
    if (!sessionId) {
      setMessages([])
      setSources([])
      return
    }
    api.get(`/api/chat/sessions/${sessionId}/messages`)
      .then((response) => {
        setMessages(response.data.map(normalize))
        const last = [...response.data].reverse().find((message) => message.role === 'ASSISTANT')
        setSources(parseSources(last?.sources))
      })
      .catch(() => toast.error('This conversation could not be opened.'))
  }, [sessionId])

  useEffect(() => {
    if (nearBottom && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, nearBottom])

  function onScroll() {
    const node = listRef.current
    if (!node) return
    setNearBottom(node.scrollHeight - node.scrollTop - node.clientHeight < 80)
  }

  async function ensureSession() {
    if (sessionId) return sessionId
    const response = await api.post('/api/chat/sessions', {})
    await loadSessions()
    navigate(`/chat/${response.data.id}`)
    return response.data.id
  }

  async function send(text, regenerate = false) {
    const question = (text ?? draft).trim()
    if (!regenerate && !question) return
    const id = await ensureSession()
    if (!regenerate) {
      setMessages((current) => [...current, { id: `local-${Date.now()}`, role: 'USER', content: question, sources: [] }])
      setDraft('')
    } else {
      setMessages((current) => {
        const next = [...current]
        if (next.at(-1)?.role === 'ASSISTANT') next.pop()
        return next
      })
    }
    const localId = `assistant-${Date.now()}`
    setMessages((current) => [...current, { id: localId, role: 'ASSISTANT', content: '', sources: [], pending: true }])
    setSources([])
    setStreaming(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      await streamMessage(id, regenerate ? { regenerate: true } : { content: question }, {
        onToken: (token) => {
          setMessages((current) => current.map((message) => message.id === localId
            ? { ...message, content: message.content + token }
            : message))
        },
        onSources: (next) => {
          setSources(next)
          setMessages((current) => current.map((message) => message.id === localId ? { ...message, sources: next } : message))
        },
        onDone: (done) => {
          setMessages((current) => current.map((message) => message.id === localId
            ? { ...message, id: done.messageId, content: done.content, pending: false }
            : message))
          loadSessions()
        },
        onError: (message) => toast.error(typeof message === 'string' ? message : 'The answer failed.'),
      }, controller.signal)
    } catch (error) {
      if (error.name !== 'AbortError') toast.error(error.message)
    } finally {
      setStreaming(false)
      setMessages((current) => current.map((message) => message.pending ? { ...message, pending: false } : message))
    }
  }

  async function removeSession(id) {
    await api.delete(`/api/chat/sessions/${id}`)
    if (id === sessionId) navigate('/chat')
    loadSessions()
  }

  async function rate(message, value) {
    await api.patch(`/api/chat/messages/${message.id}/rating`, { rating: value })
    setMessages((current) => current.map((item) => item.id === message.id ? { ...item, rating: value } : item))
  }

  const groups = groupSessions(sessions)

  return (
    <Shell title="Consultant" description="Answers use only completed brochures.">
      <div className="grid h-full md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <aside className="hidden h-full flex-col border-r border-line bg-surface md:flex" data-lenis-prevent>
          <div className="p-3">
            <Button className="w-full" variant="secondary" onClick={() => navigate('/chat')}><Plus className="h-4 w-4" /> New chat</Button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4" data-lenis-prevent>
            {groups.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="px-2 py-1 text-xs font-medium text-muted">{group.label}</p>
                {group.items.map((session) => (
                  <div key={session.id} className={`group flex items-center rounded-[8px] ${session.id === sessionId ? 'bg-accent-tint' : 'hover:bg-canvas'}`}>
                    <Link className="min-w-0 flex-1 truncate px-2 py-2 text-sm" to={`/chat/${session.id}`}>{session.title}</Link>
                    <button className="mr-1 hidden h-8 w-8 items-center justify-center group-hover:inline-flex" aria-label="Delete conversation" onClick={() => removeSession(session.id)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </aside>
        <section className="relative flex h-full min-w-0 flex-col">
          <div ref={listRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-6 md:px-8" data-lenis-prevent>
            {messages.length === 0 && (
              <div className="mx-auto max-w-3xl">
                <p className="text-sm text-muted">Hyundai consultant</p>
                <h2 className="mt-2 font-heading text-3xl">Ask from the brochures on file.</h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {prompts.map((prompt) => (
                    <button key={prompt} className="rounded-[12px] border border-line bg-surface p-4 text-left text-sm hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]" onClick={() => send(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {messages.map((message) => (
                <Message key={message.id} message={message} onCopy={() => navigator.clipboard.writeText(message.content)} onRegenerate={() => send('', true)} onRate={rate} disabled={streaming} />
              ))}
            </div>
          </div>
          {!nearBottom && (
            <button className="absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full border border-line bg-surface px-3 py-2 text-sm shadow-[var(--shadow-soft)]" onClick={() => { listRef.current.scrollTop = listRef.current.scrollHeight }}>
              <ArrowDown className="mr-1 inline h-4 w-4" /> Jump to latest
            </button>
          )}
          <form className="border-t border-line bg-canvas px-4 py-3 md:px-8" onSubmit={(event) => { event.preventDefault(); send() }}>
            <div className="mx-auto flex max-w-3xl items-end gap-2">
              <textarea
                className="max-h-40 min-h-11 flex-1 resize-none rounded-[12px] border border-line bg-surface px-3 py-2 text-sm outline-none"
                rows={1}
                value={draft}
                placeholder="Ask about a brochure"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    send()
                  }
                }}
              />
              {streaming ? (
                <Button type="button" variant="secondary" aria-label="Stop generating" onClick={() => abortRef.current?.abort()}><Square className="h-4 w-4" /></Button>
              ) : (
                <Button type="submit" aria-label="Send" disabled={!draft.trim()}><Send className="h-4 w-4" /></Button>
              )}
            </div>
            <p className="mx-auto mt-2 max-w-3xl text-xs text-muted">Answers are based only on uploaded brochures.</p>
          </form>
        </section>
        <SourcePanel sources={sources} />
      </div>
    </Shell>
  )
}

function Message({ message, onCopy, onRegenerate, onRate, disabled }) {
  if (message.role === 'USER') {
    return <div className="flex justify-end"><div className="max-w-[70ch] rounded-[16px] rounded-br-[8px] bg-accent px-4 py-3 text-sm text-white">{message.content}</div></div>
  }
  const parts = splitAnswer(message.content)
  return (
    <article className="rounded-[16px] border border-line bg-surface p-4" aria-live={message.pending ? 'polite' : 'off'}>
      <div className="mb-3 flex items-center gap-2 text-sm text-muted">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-navy text-xs text-white">H</span>
        Consultant
      </div>
      {message.pending && !message.content && <Typing />}
      <div className={message.pending ? 'caret' : ''}>
        {parts.confirmed && <AnswerBlock title="Confirmed from brochures" text={parts.confirmed} />}
        {parts.recommendation && <AnswerBlock title="Recommendation" text={parts.recommendation} tint />}
        {!parts.confirmed && !parts.recommendation && message.content && <AnswerBlock text={message.content} />}
      </div>
      {!message.pending && message.content && (
        <div className="mt-3 flex gap-1">
          <button className="inline-flex h-11 items-center gap-1 rounded-[8px] px-2 text-sm text-muted hover:bg-canvas" onClick={onCopy}><Copy className="h-4 w-4" /> Copy</button>
          <button className="inline-flex h-11 items-center rounded-[8px] px-2 text-sm text-muted hover:bg-canvas" disabled={disabled} onClick={onRegenerate}>Regenerate</button>
          <button className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] hover:bg-canvas" aria-label="Helpful" onClick={() => onRate(message, 1)}><ThumbsUp className={`h-4 w-4 ${message.rating === 1 ? 'text-accent' : ''}`} /></button>
          <button className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] hover:bg-canvas" aria-label="Not helpful" onClick={() => onRate(message, -1)}><ThumbsDown className={`h-4 w-4 ${message.rating === -1 ? 'text-danger' : ''}`} /></button>
        </div>
      )}
    </article>
  )
}

function AnswerBlock({ title, text, tint }) {
  return (
    <div className={`answer mb-3 rounded-[12px] p-3 ${tint ? 'bg-accent-tint' : 'bg-canvas'}`}>
      {title ? <h2>{title}</h2> : null}
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        table: ({ children }) => <div className="table-scroll"><table>{children}</table></div>,
        td: ({ children }) => <td>{markMissing(children)}</td>,
        p: ({ children }) => <p>{markMissing(children)}</p>,
      }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}

function markMissing(children) {
  const phrase = 'Not available in the uploaded brochures'
  if (typeof children === 'string' && children.includes(phrase)) {
    return <span className="missing">{children}</span>
  }
  return children
}

function splitAnswer(markdown) {
  if (!markdown) return {}
  const recMatch = markdown.split(/## Recommendation/i)
  if (recMatch.length === 1) {
    return { confirmed: markdown.replace(/## Confirmed from brochures/i, '').trim() }
  }
  return {
    confirmed: recMatch[0].replace(/## Confirmed from brochures/i, '').trim(),
    recommendation: recMatch.slice(1).join('## Recommendation').trim(),
  }
}

function Typing() {
  return (
    <div className="mb-2 flex gap-1" aria-label="Consultant is writing">
      {[0, 1, 2].map((dot) => <span key={dot} className="pulse-dot h-2 w-2 rounded-full bg-muted" />)}
    </div>
  )
}

function SourcePanel({ sources }) {
  if (!sources?.length) return <aside className="hidden border-l border-line bg-surface xl:block" />
  return (
    <aside className="hidden overflow-y-auto border-l border-line bg-surface p-4 xl:block" data-lenis-prevent>
      <h2 className="font-heading text-sm">Sources</h2>
      <ul className="mt-3 space-y-2">
        {sources.map((source, index) => (
          <li key={`${source.documentId}-${source.pageNumber}-${index}`}>
            <button
              className="w-full rounded-[12px] border border-line p-3 text-left text-sm hover:bg-canvas"
              title={source.snippet}
              onClick={() => openPdf(source)}
            >
              <span className="font-medium">{source.documentName}</span>
              <span className="mt-1 block text-xs text-muted">p.{source.pageNumber}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}

async function openPdf(source) {
  const response = await api.get(`/api/documents/${source.documentId}/file`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  window.open(`${url}#page=${source.pageNumber}`, '_blank', 'noopener')
}

function normalize(message) {
  return { ...message, sources: parseSources(message.sources), pending: false }
}

function parseSources(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  try { return JSON.parse(value) } catch { return [] }
}
