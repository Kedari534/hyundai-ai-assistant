import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowDown,
  ArrowLeftRight,
  Car,
  Copy,
  FileText,
  Gauge,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Users
} from 'lucide-react'
import { toast } from 'sonner'
import Shell from '../components/Shell'
import { Button } from '../components/ui'
import api, { streamMessage } from '../lib/api'
import { groupSessions } from '../lib/format'

const promptCards = [
  {
    title: 'Alcazar Features',
    prompt: 'List the Alcazar features from the brochure',
    desc: 'Key equipment, comfort, tech & seating options',
    icon: Sparkles
  },
  {
    title: 'Alcazar vs Creta',
    prompt: 'Compare Alcazar vs Creta',
    desc: 'Seating capacity, boot space & dimensions',
    icon: ArrowLeftRight
  },
  {
    title: 'Alcazar Variants',
    prompt: 'Compare Alcazar variants',
    desc: 'Executive, Prestige, Platinum & Signature',
    icon: Car
  },
  {
    title: 'i20 vs Aura',
    prompt: 'Should I recommend i20 or Aura?',
    desc: 'Compact hatchback vs smart family sedan',
    icon: Users
  },
  {
    title: 'Engine Comparison',
    prompt: 'Compare the engines',
    desc: 'Power, torque, transmission & fuel efficiency',
    icon: Gauge
  },
  {
    title: 'Family Recommendation',
    prompt: 'Best car for my family',
    desc: 'Safety ratings, ADAS & space analysis',
    icon: ShieldCheck
  },
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
    <Shell title="Consultant" description="AI automotive consultant with strict RAG retrieval from official Hyundai brochures.">
      <div className="grid h-full md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_320px] overflow-hidden">
        {/* Conversations Sidebar */}
        <aside className="hidden h-full flex-col border-r border-line bg-surface md:flex overflow-hidden" data-lenis-prevent>
          <div className="p-3 border-b border-line/60">
            <Button className="w-full shadow-sm hover:shadow" variant="secondary" onClick={() => navigate('/chat')}>
              <Plus className="h-4 w-4 mr-1 text-accent" /> New conversation
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-3" data-lenis-prevent>
            {groups.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted/80">{group.label}</p>
                {group.items.map((session) => (
                  <div
                    key={session.id}
                    className={`group flex items-center rounded-[10px] my-0.5 transition-colors ${
                      session.id === sessionId
                        ? 'bg-accent-tint text-navy font-semibold shadow-xs'
                        : 'text-ink/80 hover:bg-canvas hover:text-ink'
                    }`}
                  >
                    <Link className="min-w-0 flex-1 truncate px-2.5 py-2 text-sm" to={`/chat/${session.id}`}>
                      {session.title}
                    </Link>
                    <button
                      className="mr-1 hidden h-7 w-7 items-center justify-center rounded-md text-muted hover:text-danger hover:bg-white group-hover:inline-flex transition-colors"
                      aria-label="Delete conversation"
                      onClick={() => removeSession(session.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* Chat Feed */}
        <section className="relative flex h-full min-w-0 flex-col overflow-hidden bg-canvas">
          <div ref={listRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-6 md:px-8" data-lenis-prevent>
            {messages.length === 0 && (
              <div className="mx-auto max-w-3xl py-4">
                <div className="mb-6 flex items-center gap-2">
                  <span className="flex h-6 items-center rounded-full bg-accent/10 px-2.5 text-xs font-semibold uppercase tracking-wider text-accent">
                    Dealership Assistant
                  </span>
                  <span className="text-xs text-muted">Official Brochure Retrieval</span>
                </div>
                <h2 className="font-heading text-3xl font-bold tracking-tight text-navy">
                  Ask from the brochures on file.
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Instant factual comparisons, variants analysis, specifications & recommendations with zero hallucination.
                </p>

                <div className="mt-8 grid gap-3.5 sm:grid-cols-2">
                  {promptCards.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.title}
                        className="group flex flex-col text-left rounded-[14px] border border-line bg-surface p-4.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
                        onClick={() => send(item.prompt)}
                      >
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="font-heading text-sm font-bold text-navy group-hover:text-accent">
                            {item.title}
                          </span>
                        </div>
                        <p className="text-xs text-muted leading-relaxed">
                          {item.desc}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mx-auto flex max-w-4xl flex-col gap-5">
              {messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  onCopy={() => {
                    navigator.clipboard.writeText(message.content)
                    toast.success('Copied response to clipboard')
                  }}
                  onRegenerate={() => send('', true)}
                  onRate={rate}
                  disabled={streaming}
                />
              ))}
            </div>
          </div>

          {!nearBottom && (
            <button
              className="absolute bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-line bg-surface/95 backdrop-blur px-4 py-2 text-xs font-semibold text-navy shadow-lg transition-transform hover:scale-105"
              onClick={() => { listRef.current.scrollTop = listRef.current.scrollHeight }}
            >
              <ArrowDown className="h-3.5 w-3.5 text-accent" /> Jump to latest
            </button>
          )}

          {/* Chat Input Bar */}
          <form className="border-t border-line bg-surface/95 backdrop-blur px-4 py-3.5 md:px-8" onSubmit={(event) => { event.preventDefault(); send() }}>
            <div className="mx-auto flex max-w-4xl items-end gap-2.5">
              <div className="relative flex-1">
                <textarea
                  className="max-h-40 min-h-12 w-full resize-none rounded-[14px] border border-line bg-canvas px-4 py-3 text-sm text-ink placeholder:text-muted outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/10"
                  rows={1}
                  value={draft}
                  placeholder="Ask any specification, comparison, or recommendation..."
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      send()
                    }
                  }}
                />
              </div>
              {streaming ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-12 w-12 rounded-[14px] shrink-0 border-line text-danger hover:bg-danger-tint"
                  aria-label="Stop generating"
                  onClick={() => abortRef.current?.abort()}
                >
                  <Square className="h-4 w-4 fill-current" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="h-12 px-5 rounded-[14px] shrink-0 font-semibold shadow-sm hover:shadow"
                  aria-label="Send"
                  disabled={!draft.trim()}
                >
                  <Send className="h-4 w-4 mr-1" /> Send
                </Button>
              )}
            </div>
            <p className="mx-auto mt-2 max-w-4xl text-[11px] text-muted flex items-center justify-between">
              <span>Answers are strictly grounded in uploaded brochures — zero hallucination.</span>
              <span className="hidden sm:inline">Shift + Enter for new line</span>
            </p>
          </form>
        </section>

        {/* Fixed Right-Side Sources Panel */}
        <SourcePanel sources={sources} />
      </div>
    </Shell>
  )
}

function Message({ message, onCopy, onRegenerate, onRate, disabled }) {
  if (message.role === 'USER') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75ch] rounded-[18px] rounded-br-[4px] bg-gradient-to-r from-accent to-[#0052a3] px-5 py-3.5 text-sm text-white shadow-md leading-relaxed">
          {message.content}
        </div>
      </div>
    )
  }

  const parts = splitAnswer(message.content)

  return (
    <article className="rounded-[18px] border border-line bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm" aria-live={message.pending ? 'polite' : 'off'}>
      <div className="mb-3.5 flex items-center justify-between border-b border-line/50 pb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-navy font-heading text-xs font-bold text-white shadow-xs">
            H
          </span>
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-navy">
              Hyundai Consultant
            </span>
            <span className="block text-[11px] text-muted">Verified Brochure Facts</span>
          </div>
        </div>

        {message.sources?.length > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
            <FileText className="h-3 w-3" />
            {message.sources.length} sources
          </span>
        )}
      </div>

      {message.pending && !message.content && <Typing />}

      <div className={message.pending ? 'caret' : ''}>
        {parts.confirmed && <AnswerBlock title="Confirmed Specifications & Facts" text={parts.confirmed} />}
        {parts.recommendation && <AnswerBlock title="Consultant Recommendation" text={parts.recommendation} tint />}
        {!parts.confirmed && !parts.recommendation && message.content && <AnswerBlock text={message.content} />}
      </div>

      {!message.pending && message.content && (
        <div className="mt-3.5 flex items-center justify-between border-t border-line/40 pt-2.5 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <button
              className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 hover:bg-canvas hover:text-ink transition-colors"
              onClick={onCopy}
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
            <button
              className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 hover:bg-canvas hover:text-ink transition-colors disabled:opacity-50"
              disabled={disabled}
              onClick={onRegenerate}
            >
              Regenerate
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-canvas hover:text-accent transition-colors"
              aria-label="Helpful"
              onClick={() => onRate(message, 1)}
            >
              <ThumbsUp className={`h-3.5 w-3.5 ${message.rating === 1 ? 'text-accent fill-accent' : ''}`} />
            </button>
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-canvas hover:text-danger transition-colors"
              aria-label="Not helpful"
              onClick={() => onRate(message, -1)}
            >
              <ThumbsDown className={`h-3.5 w-3.5 ${message.rating === -1 ? 'text-danger fill-danger' : ''}`} />
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

function AnswerBlock({ title, text, tint }) {
  return (
    <div className={`answer mb-3 rounded-[14px] p-4 ${tint ? 'bg-accent-tint/60 border border-accent/20' : 'bg-canvas/60 border border-line/60'}`}>
      {title ? (
        <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-navy flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${tint ? 'bg-accent' : 'bg-navy'}`} />
          {title}
        </h3>
      ) : null}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="table-scroll-wrapper">
              <div className="table-scroll-hint">
                <span>↔ Scroll right to compare all specifications</span>
              </div>
              <div className="table-scroll">
                <table>{children}</table>
              </div>
            </div>
          ),
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
  const phrases = [
    'Not available in the uploaded brochures',
    'Not available in brochures',
    'N/A'
  ]
  if (typeof children === 'string') {
    for (const phrase of phrases) {
      if (children.includes(phrase)) {
        return <span className="missing">{children}</span>
      }
    }
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
    <div className="flex items-center gap-3 py-3 px-2 text-xs font-medium text-accent">
      <span className="flex gap-1.5">
        <span className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
      <span>Consulting brochures & synthesizing specifications...</span>
    </div>
  )
}

function SourcePanel({ sources }) {
  if (!sources?.length) {
    return (
      <aside className="hidden h-full flex-col border-l border-line bg-surface p-5 xl:flex">
        <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-muted/80">
          Source Citations
        </h3>
        <div className="mt-8 flex flex-col items-center justify-center text-center text-muted">
          <FileText className="h-8 w-8 text-muted/40 mb-2 stroke-1" />
          <p className="text-xs font-medium">No citations active</p>
          <p className="text-[11px] text-muted/70 mt-1 max-w-[200px]">
            Citations appear here automatically when the consultant retrieves facts from brochures.
          </p>
        </div>
      </aside>
    )
  }

  return (
    <aside className="hidden h-full flex-col overflow-y-auto border-l border-line bg-surface p-4 xl:flex" data-lenis-prevent>
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-navy flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-accent" />
          Verified Sources
        </h3>
        <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[11px] font-bold text-accent">
          {sources.length} cited
        </span>
      </div>

      <ul className="mt-3.5 space-y-2.5">
        {sources.map((source, index) => (
          <li key={`${source.documentId}-${source.pageNumber}-${index}`}>
            <button
              className="group w-full rounded-[12px] border border-line bg-canvas/40 p-3 text-left transition-all hover:bg-surface hover:border-accent/40 hover:shadow-xs"
              title={source.snippet}
              onClick={() => openPdf(source)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-bold text-navy group-hover:text-accent">
                  {source.documentName}
                </span>
                <span className="shrink-0 rounded bg-navy/5 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                  p.{source.pageNumber}
                </span>
              </div>
              {source.vehicleModel && (
                <span className="mt-1.5 inline-block rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-accent uppercase">
                  {source.vehicleModel}
                </span>
              )}
              {source.snippet && (
                <p className="mt-2 line-clamp-2 text-[11px] text-muted leading-relaxed">
                  {source.snippet}
                </p>
              )}
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
