import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  ArrowRight,
  Car,
  Clock,
  Database,
  FileCheck,
  FileText,
  Layers,
  MessageSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload
} from 'lucide-react'
import { toast } from 'sonner'
import Shell from '../components/Shell'
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '../components/ui'
import api, { errorMessage } from '../lib/api'
import { modelLabel, relativeTime } from '../lib/format'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [models, setModels] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [docsRes, modelsRes, sessionsRes] = await Promise.all([
        api.get('/api/documents'),
        api.get('/api/documents/models'),
        api.get('/api/chat/sessions'),
      ])
      setDocuments(docsRes.data || [])
      setModels(modelsRes.data || [])
      setSessions(sessionsRes.data || [])
    } catch (err) {
      setError(errorMessage(err))
      toast.error('Could not load dashboard statistics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Calculate real metrics from official backend data (zero mock data)
  const completedDocs = documents.filter((doc) => doc.status === 'COMPLETED')
  const totalChunks = documents.reduce((sum, doc) => sum + (doc.chunksCount || 0), 0)
  const totalPages = documents.reduce((sum, doc) => sum + (doc.totalPages || 0), 0)

  return (
    <Shell
      title="Dealership Dashboard"
      description="Real-time brochure intelligence and sales consultant activity."
      action={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate('/documents')}
            className="hidden sm:inline-flex"
          >
            <Upload className="h-3.5 w-3.5" /> Upload Brochure
          </Button>
          <Button size="sm" onClick={() => navigate('/chat')}>
            <Plus className="h-3.5 w-3.5" /> New Consultation
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        {error && <ErrorState body={error} onRetry={loadData} />}

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Skeleton className="h-64 lg:col-span-2" />
              <Skeleton className="h-64" />
            </div>
          </div>
        ) : (
          <>
            {/* Real Metrics Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Official Brochures
                  </span>
                  <div className="grid h-8 w-8 place-items-center rounded-[8px] bg-accent/10 text-accent">
                    <FileCheck className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-heading text-3xl font-extrabold text-navy">
                    {completedDocs.length}
                  </span>
                  <span className="text-xs text-muted">
                    of {documents.length} files verified
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  {totalPages > 0 ? `${totalPages} brochure pages extracted` : 'Grounded in uploaded PDFs'}
                </p>
              </Card>

              <Card className="relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Vehicle Lineup
                  </span>
                  <div className="grid h-8 w-8 place-items-center rounded-[8px] bg-navy/10 text-navy">
                    <Car className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-heading text-3xl font-extrabold text-navy">
                    {models.length}
                  </span>
                  <span className="text-xs text-muted">Hyundai models</span>
                </div>
                <p className="mt-1 text-[11px] text-muted truncate">
                  {models.join(', ') || 'Awaiting uploads'}
                </p>
              </Card>

              <Card className="relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Vector Index
                  </span>
                  <div className="grid h-8 w-8 place-items-center rounded-[8px] bg-emerald-500/10 text-emerald-600">
                    <Database className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-heading text-3xl font-extrabold text-navy">
                    {totalChunks}
                  </span>
                  <span className="text-xs text-muted">indexed chunks</span>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  Supabase pgvector 1536-dim embeddings
                </p>
              </Card>

              <Card className="relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Sales Sessions
                  </span>
                  <div className="grid h-8 w-8 place-items-center rounded-[8px] bg-amber-500/10 text-amber-600">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-heading text-3xl font-extrabold text-navy">
                    {sessions.length}
                  </span>
                  <span className="text-xs text-muted">consultations</span>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  All sessions saved for staff reference
                </p>
              </Card>
            </div>

            {/* Quick Action Launchers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Link
                to="/chat"
                className="group flex flex-col justify-between rounded-[14px] border border-line bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-[10px] bg-accent-tint text-accent">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                  </div>
                  <h3 className="mt-4 font-heading text-base font-bold text-navy group-hover:text-accent">
                    Brochure Consultant
                  </h3>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Ask any question about Hyundai specs, variants, dimensions, or fuel efficiency with verified citations.
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center text-xs font-semibold text-accent">
                  Open Chat Assistant &rarr;
                </span>
              </Link>

              <Link
                to="/compare"
                className="group flex flex-col justify-between rounded-[14px] border border-line bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-[10px] bg-navy/10 text-navy">
                      <ArrowLeftRight className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                  </div>
                  <h3 className="mt-4 font-heading text-base font-bold text-navy group-hover:text-accent">
                    Side-by-Side Comparison
                  </h3>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Compare any two Hyundai vehicles across powertrains, dimensions, boot space, and safety suites.
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center text-xs font-semibold text-accent">
                  Launch Comparison Matrix &rarr;
                </span>
              </Link>

              <Link
                to="/recommend"
                className="group flex flex-col justify-between rounded-[14px] border border-line bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-[10px] bg-accent-tint text-accent">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                  </div>
                  <h3 className="mt-4 font-heading text-base font-bold text-navy group-hover:text-accent">
                    Customer Recommendation Wizard
                  </h3>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    4-step guided questionnaire to find the exact car match based on customer lifestyle and budget.
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center text-xs font-semibold text-accent">
                  Start Advisor Wizard &rarr;
                </span>
              </Link>
            </div>

            {/* Split Section: Ingested Brochures & Recent Consultations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Ingested Brochures (2 columns) */}
              <div className="lg:col-span-2 rounded-[14px] border border-line bg-surface p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4 border-b border-line pb-3">
                  <div>
                    <h3 className="font-heading text-base font-bold text-navy">
                      Brochures in Knowledge Base
                    </h3>
                    <p className="text-xs text-muted">
                      Official documents powering the AI responses
                    </p>
                  </div>
                  <Link
                    to="/documents"
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    Manage all ({documents.length})
                  </Link>
                </div>

                {documents.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No brochures uploaded yet"
                    body="Upload official Hyundai PDFs to start answering customer inquiries."
                    action={
                      <Button size="sm" onClick={() => navigate('/documents')}>
                        Upload First Brochure
                      </Button>
                    }
                  />
                ) : (
                  <div className="divide-y divide-line">
                    {documents.slice(0, 5).map((doc) => (
                      <div key={doc.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-accent-tint text-accent">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-navy">
                              {doc.displayName}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {modelLabel(doc.vehicleModel)} · {doc.totalPages || 0} pages · {doc.chunksCount || 0} vector chunks
                            </p>
                          </div>
                        </div>
                        <Badge status={doc.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Consultations (1 column) */}
              <div className="rounded-[14px] border border-line bg-surface p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4 border-b border-line pb-3">
                  <div>
                    <h3 className="font-heading text-base font-bold text-navy">
                      Recent Inquiries
                    </h3>
                    <p className="text-xs text-muted">Saved conversations</p>
                  </div>
                  <Link
                    to="/chat"
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    View all
                  </Link>
                </div>

                {sessions.length === 0 ? (
                  <p className="text-xs text-muted py-6 text-center">
                    No conversations yet. Start your first chat!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sessions.slice(0, 5).map((session) => (
                      <Link
                        key={session.id}
                        to={`/chat/${session.id}`}
                        className="group flex items-center justify-between rounded-[8px] p-2.5 hover:bg-canvas transition-colors border border-transparent hover:border-line"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-navy group-hover:text-accent">
                            {session.title || 'Brochure Inquiry'}
                          </p>
                          <p className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {relativeTime(session.createdAt)}
                          </p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted group-hover:text-accent shrink-0 ml-2" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Shell>
  )
}
