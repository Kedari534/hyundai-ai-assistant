import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Clock,
  Download,
  FileCheck,
  FileText,
  Filter,
  MoreHorizontal,
  RefreshCw,
  Search,
  Trash2,
  Upload
} from 'lucide-react'
import { toast } from 'sonner'
import Shell from '../components/Shell'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  FileDropzone,
  Menu,
  MenuItem,
  Modal,
  Select,
  Skeleton,
  TextInput
} from '../components/ui'
import api, { errorMessage } from '../lib/api'
import { exactTime, modelLabel, relativeTime } from '../lib/format'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [models, setModels] = useState([])
  const [state, setState] = useState('loading')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [errorDoc, setErrorDoc] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const [modelFilter, setModelFilter] = useState('ALL')

  async function load() {
    try {
      const [docs, modelList] = await Promise.all([
        api.get('/api/documents'),
        api.get('/api/documents/models'),
      ])
      setDocuments(docs.data)
      setModels(modelList.data)
      setState('ready')
    } catch (error) {
      setState('error')
      toast.error(errorMessage(error))
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Auto-poll when any document is in UPLOADED or PROCESSING status
  useEffect(() => {
    const active = documents.some((doc) => doc.status === 'UPLOADED' || doc.status === 'PROCESSING')
    if (!active) return undefined
    const timer = setInterval(async () => {
      try {
        const response = await api.get('/api/documents')
        setDocuments(response.data)
      } catch {
        /* keep last valid list */
      }
    }, 2500)
    return () => clearInterval(timer)
  }, [documents])

  async function reprocess(id) {
    try {
      await api.post(`/api/documents/${id}/reprocess`)
      toast.success('Reprocessing started')
      load()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function remove() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await api.delete(`/api/documents/${pendingDelete.id}`)
      setPendingDelete(null)
      toast.success('Brochure deleted successfully')
      load()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  async function view(doc) {
    try {
      const response = await api.get(`/api/documents/${doc.id}/file`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      window.open(url, '_blank', 'noopener')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  // Filter documents by search term and vehicle model
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      doc.vehicleModel?.toLowerCase().includes(search.toLowerCase())
    const matchesModel = modelFilter === 'ALL' || doc.vehicleModel === modelFilter
    return matchesSearch && matchesModel
  })

  return (
    <Shell
      title="Official Brochures"
      description="Manage Hyundai PDF brochures. Extracted specifications and vectors are indexed automatically."
      action={
        <Button onClick={() => setUploadOpen(true)} className="font-semibold shadow-sm">
          <Upload className="h-4 w-4 mr-1.5" /> Upload Brochure
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Search & Filter Bar */}
        {documents.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search brochures..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-[8px] border border-line bg-surface pl-10 pr-3.5 text-xs text-ink placeholder:text-muted outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-muted whitespace-nowrap">Filter Model:</span>
              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="h-10 rounded-[8px] border border-line bg-surface px-3 text-xs text-navy outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <option value="ALL">All Models ({documents.length})</option>
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Loading Skeletons */}
        {state === 'loading' && (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <ErrorState
            title="Unable to load brochures"
            body="Could not connect to the document indexing service. Please try again."
            onRetry={load}
          />
        )}

        {/* Empty State */}
        {state === 'ready' && documents.length === 0 && (
          <div className="rounded-[16px] border border-dashed border-line bg-surface p-12 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-accent-tint text-accent">
              <FileCheck className="h-7 w-7" />
            </div>
            <h2 className="font-heading text-xl font-bold text-navy">No brochures in knowledge base</h2>
            <p className="mx-auto mt-2 max-w-md text-xs text-muted leading-relaxed">
              Upload an official Hyundai PDF brochure. All extracted specs, tables, and dimensions will be embedded into pgvector for the AI Consultant.
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="h-4 w-4 mr-1.5" /> Upload First Brochure
              </Button>
            </div>
          </div>
        )}

        {/* Documents Table */}
        {state === 'ready' && documents.length > 0 && (
          <>
            {filteredDocs.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No matching brochures"
                body="Try adjusting your search query or model filter."
              />
            ) : (
              <div className="overflow-hidden rounded-[14px] border border-line bg-surface shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-line bg-canvas text-xs font-bold uppercase tracking-wider text-muted">
                      <tr>
                        <th className="px-5 py-3.5">Brochure Document</th>
                        <th className="px-5 py-3.5">Model</th>
                        <th className="px-5 py-3.5">Pages & Chunks</th>
                        <th className="px-5 py-3.5">Uploaded</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-right"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filteredDocs.map((doc) => (
                        <tr key={doc.id} className="hover:bg-canvas/50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-accent-tint text-accent">
                                <FileText className="h-5 w-5" strokeWidth={1.8} />
                              </div>
                              <div className="min-w-0">
                                <button
                                  onClick={() => view(doc)}
                                  className="truncate font-semibold text-navy hover:text-accent text-left block text-sm transition-colors"
                                  title="Click to view brochure PDF"
                                >
                                  {doc.displayName}
                                </button>
                                <span className="text-[11px] text-muted">Official Hyundai Technical Guide</span>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-block rounded-full bg-navy/5 px-2.5 py-1 text-xs font-semibold text-navy">
                              {modelLabel(doc.vehicleModel)}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-xs text-graphite">
                            <span>{doc.totalPages ?? '—'} pages</span>
                            <span className="mx-1.5 text-muted">·</span>
                            <span>{doc.chunksCount ?? 0} vectors</span>
                          </td>

                          <td className="px-5 py-4 text-xs text-muted" title={exactTime(doc.uploadedAt)}>
                            {relativeTime(doc.uploadedAt)}
                          </td>

                          <td className="px-5 py-4">
                            <Badge status={doc.status} />
                          </td>

                          <td className="px-5 py-4 text-right">
                            <RowMenu
                              doc={doc}
                              onView={view}
                              onReprocess={reprocess}
                              onDelete={setPendingDelete}
                              onError={setErrorDoc}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Modal Dialog */}
      <UploadDialog
        open={uploadOpen}
        models={models}
        onOpenChange={setUploadOpen}
        onUploaded={load}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this brochure?"
        body="The PDF file and all corresponding vector embeddings will be permanently removed. The Consultant will no longer answer queries using this file."
        confirmLabel="Delete Brochure"
        loading={deleting}
        onConfirm={remove}
      />

      {/* Error Details Modal */}
      <Modal
        open={!!errorDoc}
        onOpenChange={(open) => !open && setErrorDoc(null)}
        title="Ingestion Error Details"
        description={errorDoc?.displayName}
      >
        <div className="space-y-4 py-2">
          <div className="rounded-[8px] bg-danger-tint p-4 border border-danger/20 text-xs text-graphite">
            <p className="font-semibold text-danger mb-1 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" /> Processing Failure:
            </p>
            <p>{errorDoc?.errorMessage || 'No detailed error message was recorded.'}</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                const id = errorDoc.id
                setErrorDoc(null)
                reprocess(id)
              }}
            >
              Retry Ingestion
            </Button>
            <Button onClick={() => setErrorDoc(null)}>Close</Button>
          </div>
        </div>
      </Modal>
    </Shell>
  )
}

function RowMenu({ doc, onView, onReprocess, onDelete, onError }) {
  return (
    <Menu
      trigger={
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-muted hover:bg-canvas hover:text-ink transition-colors"
          aria-label={`Actions for ${doc.displayName}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      }
    >
      <MenuItem icon={Download} onSelect={() => onView(doc)}>
        View PDF
      </MenuItem>
      <MenuItem icon={RefreshCw} onSelect={() => onReprocess(doc.id)}>
        Reprocess Indexing
      </MenuItem>
      {doc.status === 'FAILED' && (
        <MenuItem icon={AlertCircle} onSelect={() => onError(doc)}>
          View Error Details
        </MenuItem>
      )}
      <MenuItem icon={Trash2} danger onSelect={() => onDelete(doc)}>
        Delete Brochure
      </MenuItem>
    </Menu>
  )
}

function UploadDialog({ open, onOpenChange, models, onUploaded }) {
  const [file, setFile] = useState(null)
  const [model, setModel] = useState('Alcazar')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (models.length && !models.includes(model)) {
      setModel(models[0])
    }
  }, [models, model])

  function handleFileSelected(next) {
    if (!next) return
    if (!next.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only official Hyundai PDF brochures are supported.')
      return
    }
    if (next.size > 25 * 1024 * 1024) {
      toast.error('The file exceeds the 25 MB limit.')
      return
    }
    setFile(next)
    if (!name) {
      setName(next.name.replace(/\.pdf$/i, ''))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!file) {
      toast.error('Please select a PDF file first.')
      return
    }
    const body = new FormData()
    body.append('file', file)
    body.append('vehicleModel', model)
    body.append('displayName', name || file.name)

    setLoading(true)
    try {
      await api.post('/api/documents', body)
      toast.success('Brochure uploaded! Background indexing started.')
      setFile(null)
      setName('')
      onOpenChange(false)
      onUploaded()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Upload Hyundai Brochure"
      description="PDF format up to 25 MB. Text-based brochures are parsed and indexed in pgvector."
      maxWidth="max-w-lg"
    >
      <form className="space-y-4 pt-2" onSubmit={handleSubmit}>
        <FileDropzone
          onFileSelected={handleFileSelected}
          accept="application/pdf,.pdf"
          disabled={loading}
        />

        {file && (
          <div className="rounded-[8px] bg-accent-tint/40 p-3 border border-accent/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <FileText className="h-4 w-4 text-accent shrink-0" />
              <span className="font-semibold text-navy truncate">{file.name}</span>
            </div>
            <span className="text-muted shrink-0 ml-2">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
        )}

        <Field label="Vehicle Model" hint="Select the primary vehicle described in this brochure.">
          <Select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            options={[
              ...models.map((m) => ({ value: m, label: `Hyundai ${m}` })),
              { value: 'Other', label: 'Other Hyundai Model' },
            ]}
          />
        </Field>

        <Field label="Display Name" hint="Friendly title shown in citations and search.">
          <TextInput
            value={name}
            placeholder="e.g. Hyundai Alcazar 2024 Product Guide"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <div className="flex justify-end gap-2.5 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} disabled={!file}>
            Start Indexing
          </Button>
        </div>
      </form>
    </Modal>
  )
}
