import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowDown,
  ArrowLeftRight,
  Car,
  Check,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Gauge,
  History,
  Info,
  PanelLeftClose,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Users,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import Shell from '../components/Shell'
import { Badge, Button } from '../components/ui'
import api, { errorMessage, streamMessage } from '../lib/api'
import { groupSessions } from '../lib/format'

const promptCards = [
  {
    title: 'Alcazar Features',
    prompt: 'List the Alcazar features from the brochure',
    desc: 'Key equipment, comfort, tech & seating options',
    icon: Sparkles,
  },
  {
    title: 'Alcazar vs Creta',
    prompt: 'Compare Alcazar vs Creta',
    desc: 'Seating capacity (6/7 vs 5), boot space & dimensions',
    icon: ArrowLeftRight,
  },
  {
    title: 'Alcazar Variants',
    prompt: 'Compare Alcazar variants',
    desc: 'Executive, Prestige, Platinum & Signature lineups',
    icon: Car,
  },
  {
    title: 'i20 vs Aura',
    prompt: 'Should I recommend i20 or Aura?',
    desc: 'Compact hatchback vs smart family sedan comparison',
    icon: Users,
  },
  {
    title: 'Engine Comparison',
    prompt: 'Compare the engines',
    desc: 'Power, torque, transmission & ARAI fuel efficiency',
    icon: Gauge,
  },
  {
    title: 'Family Recommendation',
    prompt: 'Best car for my family',
    desc: 'Safety suite, 6 airbags standard & boot space analysis',
    icon: ShieldCheck,
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
  const [showHistory, setShowHistory] = useState(true)
  const [showSources, setShowSources] = useState(false)
  const listRef = useRef(null)
  const abortRef = useRef(null)

  async function loadSessions() {
    try {
      const response = await api.get('/api/chat/sessions')
      setSessions(response.data)
    } catch {
      // silent fail or fallback
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    if (!sessionId) {
      setMessages([])
      setSources([])
      return
    }
    api.get(`/api/chat/sessions/${sessionId}/messages`)
      .then((response) => {
        setMessages(response.data.map(normalize))
        const lastAssistant = [...response.data].reverse().find((m) => m.role === 'ASSISTANT')
        if (lastAssistant?.sources) {
          setSources(parseSources(lastAssistant.sources))
        }
      })
      .catch(() => toast.error('This conversation could not be loaded.'))
  }, [sessionId])

  useEffect(() => {
    if (nearBottom && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, nearBottom])

  function onScroll() {
    const node = listRef.current
    if (!node) return
    const isAtBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 100
    setNearBottom(isAtBottom)
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
      setMessages((current) => [
        ...current,
        { id: `local-${Date.now()}`, role: 'USER', content: question, sources: [] },
      ])
      setDraft('')
    } else {
      setMessages((current) => {
        const next = [...current]
        if (next.at(-1)?.role === 'ASSISTANT') next.pop()
        return next
      })
    }

    const localId = `assistant-${Date.now()}`
    setMessages((current) => [
      ...current,
      { id: localId, role: 'ASSISTANT', content: '', sources: [], pending: true },
    ])
    setSources([])
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamMessage(
        id,
        regenerate ? { regenerate: true } : { content: question },
        {
          onToken: (token) => {
            setMessages((current) =>
              current.map((msg) =>
                msg.id === localId ? { ...msg, content: msg.content + token } : msg
              )
            )
          },
          onSources: (next) => {
            setSources(next)
            setMessages((current) =>
              current.map((msg) =>
                msg.id === localId ? { ...msg, sources: next } : msg
              )
            )
          },
          onDone: (done) => {
            setMessages((current) =>
              current.map((msg) =>
                msg.id === localId
                  ? { ...msg, id: done.messageId, content: done.content, pending: false }
                  : msg
              )
            )
            loadSessions()
          },
          onError: (msg) => {
            toast.error(typeof msg === 'string' ? msg : 'Consultant response failed.')
          },
        },
        controller.signal
      )
    } catch (error) {
      if (error.name !== 'AbortError') {
        toast.error(error.message)
      }
    } finally {
      setStreaming(false)
      setMessages((current) =>
        current.map((msg) => (msg.pending ? { ...msg, pending: false } : msg))
      )
    }
  }

  async function removeSession(id) {
    try {
      await api.delete(`/api/chat/sessions/${id}`)
      if (id === sessionId) navigate('/chat')
      loadSessions()
      toast.success('Conversation removed.')
    } catch {
      toast.error('Could not delete conversation.')
    }
  }

  async function rate(message, value) {
    try {
      await api.patch(`/api/chat/messages/${message.id}/rating`, { rating: value })
      setMessages((current) =>
        current.map((item) => (item.id === message.id ? { ...item, rating: value } : item))
      )
    } catch {
      toast.error('Could not save rating.')
    }
  }

  const groups = groupSessions(sessions)

  return (
    <Shell
      title="Hyundai Consultant"
      description="Official brochure intelligence with verified page citations"
      action={
        <div className="flex items-center gap-2">
          <button
            className={`inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-semibold border transition-all ${
              showHistory
                ? 'border-line bg-surface text-ink hover:bg-canvas'
                : 'border-accent/30 bg-accent-tint text-accent hover:bg-accent-tint/80'
            }`}
            onClick={() => setShowHistory((v) => !v)}
            title={showHistory ? 'Collapse conversation history' : 'Show conversation history'}
          >
            <History className="h-3.5 w-3.5 text-accent" />
            <span className="hidden sm:inline">{showHistory ? 'Hide History' : 'History'}</span>
          </button>

          {sources.length > 0 && (
            <button
              className={`inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-semibold border transition-all ${
                showSources
                  ? 'border-accent bg-accent text-white shadow-xs'
                  : 'border-line bg-surface text-ink hover:bg-canvas'
              }`}
              onClick={() => setShowSources((v) => !v)}
              title={showSources ? 'Hide verified sources' : 'Show verified sources'}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Sources ({sources.length})</span>
            </button>
          )}
        </div>
      }
    >
      <div className="flex h-full w-full overflow-hidden">
        {/* Collapsible Left History Drawer */}
        {showHistory && (
          <aside
            className="hidden h-full w-[250px] shrink-0 flex-col border-r border-line bg-surface md:flex overflow-hidden"
            data-lenis-prevent="true"
          >
            <div className="flex items-center justify-between p-3 border-b border-line">
              <Button
                className="flex-1 text-xs py-1.5 h-9"
                variant="secondary"
                onClick={() => navigate('/chat')}
              >
                <Plus className="h-3.5 w-3.5 mr-1 text-accent" /> New Consultation
              </Button>
              <button
                className="ml-2 p-1.5 rounded-[6px] text-muted hover:text-navy hover:bg-canvas transition-colors"
                title="Collapse history drawer"
                onClick={() => setShowHistory(false)}
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-3" data-lenis-prevent="true">
              {groups.map((group) => (
                <div key={group.label} className="mb-4">
                  <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
                    {group.label}
                  </p>
                  {group.items.map((session) => (
                    <div
                      key={session.id}
                      className={`group flex items-center rounded-[8px] my-0.5 transition-colors ${
                        session.id === sessionId
                          ? 'bg-accent-tint text-navy font-semibold shadow-xs'
                          : 'text-ink/80 hover:bg-canvas hover:text-ink'
                      }`}
                    >
                      <Link
                        className="min-w-0 flex-1 truncate px-2.5 py-2 text-xs"
                        to={`/chat/${session.id}`}
                      >
                        {session.title || 'Brochure Inquiry'}
                      </Link>
                      <button
                        className="mr-1 hidden h-6 w-6 items-center justify-center rounded-[4px] text-muted hover:text-danger hover:bg-white group-hover:inline-flex transition-colors"
                        aria-label="Delete conversation"
                        onClick={() => removeSession(session.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Central Chat Feed & Scrollable Content */}
        <section
          className="relative flex h-full flex-1 min-w-0 flex-col overflow-hidden bg-canvas"
          data-lenis-prevent="true"
        >
          {/* Scrollable Message List */}
          <div
            ref={listRef}
            onScroll={onScroll}
            className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 md:px-8"
            data-lenis-prevent="true"
          >
            {messages.length === 0 && (
              <div className="mx-auto max-w-3xl py-6">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                  <Sparkles className="h-3.5 w-3.5" />
                  Official Hyundai Brochure Intelligence
                </div>
                <h2 className="font-heading text-3xl font-extrabold tracking-tight text-navy">
                  Ask from the brochures on file.
                </h2>
                <p className="mt-2 text-sm text-muted leading-relaxed">
                  Every specification, dimension, powertrain detail, and variant comparison is extracted directly from verified Hyundai India PDFs with zero hallucination.
                </p>

                {/* 6 Quick Prompt Cards */}
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {promptCards.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.title}
                        type="button"
                        className="group flex flex-col text-left rounded-[14px] border border-line bg-surface p-4.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-md cursor-pointer"
                        onClick={() => send(item.prompt)}
                      >
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-accent-tint text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="font-heading text-sm font-bold text-navy group-hover:text-accent">
                            {item.title}
                          </span>
                        </div>
                        <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Message Thread */}
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
              {messages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  onCopy={() => {
                    navigator.clipboard.writeText(message.content)
                    toast.success('Response copied to clipboard')
                  }}
                  onRegenerate={() => send('', true)}
                  onRate={rate}
                  onOpenSources={() => setShowSources(true)}
                  disabled={streaming}
                />
              ))}
            </div>
          </div>

          {/* Jump to Latest Floating Button */}
          {!nearBottom && (
            <button
              className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-line bg-surface/95 backdrop-blur-sm px-4 py-2 text-xs font-semibold text-navy shadow-lg transition-transform hover:scale-105 z-20"
              onClick={() => {
                if (listRef.current) {
                  listRef.current.scrollTop = listRef.current.scrollHeight
                }
              }}
            >
              <ArrowDown className="h-3.5 w-3.5 text-accent" /> Jump to latest
            </button>
          )}

          {/* Sticky Bottom Composer */}
          <div className="sticky bottom-0 z-10 border-t border-line bg-surface/95 backdrop-blur-sm px-4 py-3 md:px-8">
            <form
              className="mx-auto flex w-full max-w-4xl items-end gap-2.5"
              onSubmit={(event) => {
                event.preventDefault()
                send()
              }}
            >
              <div className="relative flex-1">
                <textarea
                  className="max-h-36 min-h-[48px] w-full resize-none rounded-[12px] border border-line bg-canvas px-4 py-3 text-sm text-ink placeholder:text-muted/70 outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/15"
                  rows={1}
                  value={draft}
                  placeholder="Ask any Hyundai brochure specification, comparison, or variant..."
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
                  className="h-12 w-12 rounded-[12px] shrink-0 border-line text-danger hover:bg-danger-tint"
                  aria-label="Stop generating response"
                  onClick={() => abortRef.current?.abort()}
                >
                  <Square className="h-4 w-4 fill-current" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="h-12 px-5 rounded-[12px] shrink-0 font-semibold shadow-sm"
                  aria-label="Send query"
                  disabled={!draft.trim()}
                >
                  <Send className="h-4 w-4 mr-1.5" /> Send
                </Button>
              )}
            </form>
            <div className="mx-auto mt-2 flex max-w-4xl items-center justify-between text-[11px] text-muted">
              <span>Answers use strictly uploaded brochures — zero hallucination.</span>
              <span className="hidden sm:inline">Press Enter to send · Shift + Enter for new line</span>
            </div>
          </div>
        </section>

        {/* Collapsible Right Sources Panel (Sticky in layout) */}
        {showSources && (
          <SourcePanel sources={sources} onClose={() => setShowSources(false)} />
        )}
      </div>
    </Shell>
  )
}

function MessageItem({ message, onCopy, onRegenerate, onRate, onOpenSources, disabled }) {
  if (message.role === 'USER') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70ch] rounded-[16px] rounded-br-[4px] bg-accent px-5 py-3.5 text-sm text-white shadow-sm leading-relaxed font-medium">
          {message.content}
        </div>
      </div>
    )
  }

  const parts = splitAnswer(message.content)
  const isGreetingMessage = parts.general && !parts.confirmed && !parts.recommendation

  return (
    <article
      className="rounded-[16px] border border-line bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm"
      aria-live={message.pending ? 'polite' : 'off'}
    >
      {/* Header with Hyundai Consultant Identity */}
      <div className="mb-3.5 flex items-center justify-between border-b border-line/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-navy font-heading text-xs font-bold text-white shadow-xs">
            H
          </span>
          <div>
            <span className="block font-heading text-xs font-bold tracking-tight text-navy">
              Hyundai Consultant
            </span>
            <span className="block text-[11px] text-muted">
              {isGreetingMessage ? 'Dealership Welcome' : 'Verified Brochure Facts'}
            </span>
          </div>
        </div>

        {message.sources?.length > 0 && (
          <button
            onClick={onOpenSources}
            className="flex items-center gap-1.5 rounded-full bg-accent-tint hover:bg-accent-tint/80 px-3 py-1 text-xs font-semibold text-accent transition-colors"
            title="Click to inspect source pages"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{message.sources.length} sources</span>
          </button>
        )}
      </div>

      {message.pending && !message.content && <TypingIndicator />}

      {/* Answer Body Blocks */}
      <div className={message.pending ? 'caret' : ''}>
        {parts.general && <AnswerBlock text={parts.general} />}
        {parts.confirmed && (
          <AnswerBlock title="Confirmed Specifications & Facts" text={parts.confirmed} />
        )}
        {parts.recommendation && (
          <AnswerBlock title="Consultant Recommendation" text={parts.recommendation} tint />
        )}
        {!parts.general && !parts.confirmed && !parts.recommendation && message.content && (
          <AnswerBlock text={message.content} />
        )}
      </div>

      {/* Action Footer */}
      {!message.pending && message.content && (
        <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-xs text-muted">
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 hover:bg-canvas hover:text-ink transition-colors"
              onClick={onCopy}
              title="Copy answer"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
            <button
              className="inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 hover:bg-canvas hover:text-ink transition-colors disabled:opacity-50"
              disabled={disabled}
              onClick={onRegenerate}
              title="Regenerate response"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Regenerate
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              className={`inline-flex h-8 w-8 items-center justify-center rounded-[6px] hover:bg-canvas transition-colors ${
                message.rating === 1 ? 'text-accent fill-accent' : 'text-muted'
              }`}
              aria-label="Helpful answer"
              onClick={() => onRate(message, 1)}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              className={`inline-flex h-8 w-8 items-center justify-center rounded-[6px] hover:bg-canvas transition-colors ${
                message.rating === -1 ? 'text-danger fill-danger' : 'text-muted'
              }`}
              aria-label="Not helpful answer"
              onClick={() => onRate(message, -1)}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

function AnswerBlock({ title, text, tint }) {
  return (
    <div
      className={`answer mb-4 w-full rounded-[12px] p-4 ${
        tint ? 'bg-accent-tint/40 border border-accent/20' : 'bg-canvas/50 border border-line'
      }`}
    >
      {title && (
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-navy flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${tint ? 'bg-accent' : 'bg-navy'}`} />
          {title}
        </h3>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="table-scroll-wrapper w-full">
              <div className="table-scroll-hint">
                <span>↔ Scroll right to compare all specifications</span>
                <span>Verified Brochure Facts</span>
              </div>
              <div className="table-scroll" data-lenis-prevent="true">
                <table>{children}</table>
              </div>
            </div>
          ),
          td: ({ children }) => <td>{cleanTableCell(children)}</td>,
          p: ({ children }) => <p>{cleanTableCell(children)}</p>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}

// Convert bracketed citations into neat chips and mark missing specs
function cleanTableCell(children) {
  if (typeof children !== 'string') return children

  if (
    children.includes('Not available in the uploaded brochures') ||
    children.includes('Not available in brochures') ||
    children === 'N/A'
  ) {
    return <span className="missing">Not available in brochures</span>
  }

  return children
}

function splitAnswer(markdown) {
  if (!markdown) return {}
  const hasConfirmed = /## Confirmed from brochures/i.test(markdown)
  const hasRecommendation = /## Recommendation/i.test(markdown)

  if (!hasConfirmed && !hasRecommendation) {
    return { general: markdown.trim() }
  }

  if (hasRecommendation) {
    const recMatch = markdown.split(/## Recommendation/i)
    return {
      confirmed: recMatch[0].replace(/## Confirmed from brochures/i, '').trim(),
      recommendation: recMatch.slice(1).join('## Recommendation').trim(),
    }
  }

  return {
    confirmed: markdown.replace(/## Confirmed from brochures/i, '').trim(),
  }
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 py-3 px-2 text-xs font-medium text-accent">
      <span className="flex gap-1.5">
        <span className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
      <span>Consulting uploaded brochures & grounding answer...</span>
    </div>
  )
}

function SourcePanel({ sources, onClose }) {
  if (!sources?.length) {
    return (
      <aside
        className="h-full w-[290px] shrink-0 flex-col border-l border-line bg-surface p-4 flex"
        data-lenis-prevent="true"
      >
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-muted">
            Source Citations
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-[6px] text-muted hover:text-navy hover:bg-canvas transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="mt-12 flex flex-col items-center justify-center text-center text-muted">
          <FileText className="h-8 w-8 text-muted/30 mb-2 stroke-1" />
          <p className="text-xs font-medium">No citations active</p>
          <p className="text-[11px] text-muted/70 mt-1 max-w-[200px]">
            Citations appear here automatically when the consultant retrieves facts from brochures.
          </p>
        </div>
      </aside>
    )
  }

  return (
    <aside
      className="h-full w-[290px] shrink-0 flex-col overflow-y-auto border-l border-line bg-surface p-4 flex"
      data-lenis-prevent="true"
    >
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-accent" />
          <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-navy">
            Verified Sources
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-bold text-accent">
            {sources.length} cited
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-[6px] text-muted hover:text-navy hover:bg-canvas transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <ul className="mt-3.5 space-y-3">
        {sources.map((source, index) => (
          <li key={`${source.documentId}-${source.pageNumber}-${index}`}>
            <button
              className="group w-full rounded-[10px] border border-line bg-canvas/40 p-3 text-left transition-all hover:bg-surface hover:border-accent hover:shadow-xs cursor-pointer"
              title={source.snippet}
              onClick={() => openPdf(source)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-bold text-navy group-hover:text-accent">
                  {source.documentName}
                </span>
                <span className="shrink-0 rounded bg-navy/5 px-1.5 py-0.5 text-[10px] font-bold text-muted">
                  p.{source.pageNumber}
                </span>
              </div>
              {source.vehicleModel && (
                <span className="mt-1.5 inline-block rounded bg-accent-tint px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-accent uppercase">
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
  try {
    const response = await api.get(`/api/documents/${source.documentId}/file`, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    window.open(`${url}#page=${source.pageNumber}`, '_blank', 'noopener')
  } catch (error) {
    toast.error(errorMessage(error))
  }
}

function normalize(message) {
  return { ...message, sources: parseSources(message.sources), pending: false }
}

function parseSources(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  try {
    return JSON.parse(value)
  } catch {
    return []
  }
}
