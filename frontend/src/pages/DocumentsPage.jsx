import { useEffect, useRef, useState } from 'react'
import { FileText, MoreHorizontal, Upload } from 'lucide-react'
import { toast } from 'sonner'
import Shell from '../components/Shell'
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Menu, MenuItem, Modal, Skeleton, TextInput } from '../components/ui'
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

  useEffect(() => { load() }, [])

  useEffect(() => {
    const active = documents.some((doc) => doc.status === 'UPLOADED' || doc.status === 'PROCESSING')
    if (!active) return undefined
    const timer = setInterval(async () => {
      try {
        const response = await api.get('/api/documents')
        setDocuments(response.data)
      } catch {
        /* keep the last good list */
      }
    }, 3000)
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
    setDeleting(true)
    try {
      await api.delete(`/api/documents/${pendingDelete.id}`)
      setPendingDelete(null)
      toast.success('Brochure deleted')
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

  return (
    <Shell
      title="Brochures"
      description="Upload a Hyundai PDF. Indexing runs in the background."
      action={<Button onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4" /> Upload brochure</Button>}
    >
      {state === 'loading' && (
        <div className="space-y-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      )}
      {state === 'error' && <ErrorState body="The brochure library could not be loaded." onRetry={load} />}
      {state === 'ready' && documents.length === 0 && (
        <EmptyState
          title="No brochures yet"
          body="Upload an official Hyundai PDF. Questions in the consultant will use only files that finish processing."
          action={<Button onClick={() => setUploadOpen(true)}>Upload brochure</Button>}
        />
      )}
      {state === 'ready' && documents.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-[12px] border border-line bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-canvas text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Brochure</th>
                  <th className="px-4 py-3 font-medium">Model</th>
                  <th className="px-4 py-3 font-medium">Uploaded</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-accent" strokeWidth={1.75} />
                        <div>
                          <div className="font-medium">{doc.displayName}</div>
                          <div className="text-xs text-muted">{doc.chunksCount ?? 0} sections · {doc.totalPages ?? '—'} pages</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="rounded-full bg-accent-tint px-2 py-1 text-xs text-accent">{modelLabel(doc.vehicleModel)}</span></td>
                    <td className="px-4 py-3 text-muted" title={exactTime(doc.uploadedAt)}>{relativeTime(doc.uploadedAt)}</td>
                    <td className="px-4 py-3"><Badge status={doc.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <RowMenu doc={doc} onView={view} onReprocess={reprocess} onDelete={setPendingDelete} onError={setErrorDoc} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {documents.map((doc) => (
              <article key={doc.id} className="rounded-[12px] border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-medium">{doc.displayName}</h2>
                    <p className="mt-1 text-xs text-muted" title={exactTime(doc.uploadedAt)}>{modelLabel(doc.vehicleModel)} · {relativeTime(doc.uploadedAt)}</p>
                  </div>
                  <RowMenu doc={doc} onView={view} onReprocess={reprocess} onDelete={setPendingDelete} onError={setErrorDoc} />
                </div>
                <div className="mt-3"><Badge status={doc.status} /></div>
              </article>
            ))}
          </div>
        </>
      )}
      <UploadDialog open={uploadOpen} models={models} onOpenChange={setUploadOpen} onUploaded={load} />
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this brochure?"
        body="The file and its indexed sections are removed. Chat history stays, but new answers will not use this brochure."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={remove}
      />
      <Modal open={!!errorDoc} onOpenChange={(open) => !open && setErrorDoc(null)} title="Processing failed" description={errorDoc?.displayName}>
        <p className="text-sm text-graphite">{errorDoc?.errorMessage || 'No detail was recorded.'}</p>
      </Modal>
    </Shell>
  )
}

function RowMenu({ doc, onView, onReprocess, onDelete, onError }) {
  return (
    <Menu trigger={<button className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] hover:bg-canvas" aria-label={`Actions for ${doc.displayName}`}><MoreHorizontal className="h-4 w-4" /></button>}>
      <MenuItem onSelect={() => onView(doc)}>View PDF</MenuItem>
      <MenuItem onSelect={() => onReprocess(doc.id)}>Reprocess</MenuItem>
      {doc.status === 'FAILED' && <MenuItem onSelect={() => onError(doc)}>View error details</MenuItem>}
      <MenuItem danger onSelect={() => onDelete(doc)}>Delete</MenuItem>
    </Menu>
  )
}

function UploadDialog({ open, onOpenChange, models, onUploaded }) {
  const input = useRef(null)
  const [file, setFile] = useState(null)
  const [model, setModel] = useState('Alcazar')
  const [name, setName] = useState('')
  const [drag, setDrag] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (models.length && !models.includes(model)) setModel(models[0])
  }, [models, model])

  function choose(next) {
    if (!next) return
    if (!next.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF brochures are accepted.')
      return
    }
    if (next.size > 20 * 1024 * 1024) {
      toast.error('The file is larger than 20 MB.')
      return
    }
    setFile(next)
    if (!name) setName(next.name.replace(/\.pdf$/i, ''))
  }

  async function submit(event) {
    event.preventDefault()
    if (!file) {
      toast.error('Choose a PDF first.')
      return
    }
    const body = new FormData()
    body.append('file', file)
    body.append('vehicleModel', model)
    body.append('displayName', name)
    setLoading(true)
    try {
      await api.post('/api/documents', body)
      toast.success('Upload accepted. Indexing has started.')
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
    <Modal open={open} onOpenChange={onOpenChange} title="Upload brochure" description="PDF only, up to 20 MB. Text-based files can be indexed. Scans will fail with a clear message.">
      <form className="space-y-4" onSubmit={submit}>
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(event) => { event.preventDefault(); setDrag(false); choose(event.dataTransfer.files?.[0]) }}
          className={`flex min-h-32 w-full flex-col items-center justify-center rounded-[12px] border border-dashed px-4 text-sm ${drag ? 'border-accent bg-accent-tint' : 'border-line bg-canvas'}`}
        >
          <Upload className="mb-2 h-5 w-5 text-accent" />
          {file ? file.name : 'Drop a PDF here, or click to browse'}
          <span className="mt-1 text-xs text-muted">Hyundai brochure · PDF · 20 MB max</span>
        </button>
        <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => choose(event.target.files?.[0])} />
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Vehicle model</span>
          <select className="h-11 w-full rounded-[8px] border border-line bg-surface px-3" value={model} onChange={(event) => setModel(event.target.value)}>
            {models.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Display name</span>
          <TextInput value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="flex justify-end">
          <Button type="submit" loading={loading}>Start indexing</Button>
        </div>
      </form>
    </Modal>
  )
}
