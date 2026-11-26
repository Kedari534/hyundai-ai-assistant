import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeftRight,
  Car,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Gauge,
  Layers,
  RotateCcw,
  ShieldCheck,
  Sparkles
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import Shell from '../components/Shell'
import { Badge, Button, Card, EmptyState, Field, Select } from '../components/ui'
import api, { errorMessage, streamMessage } from '../lib/api'

const comparisonPresets = [
  {
    title: 'Alcazar vs Creta',
    desc: 'Seating capacity (6/7 vs 5), boot space, dimensions & wheelbases',
    car1: 'Alcazar',
    car2: 'Creta',
    dimension: 'dimensions',
  },
  {
    title: 'i20 vs Aura',
    desc: 'Premium hatchback vs compact sedan, boot space & fuel economy',
    car1: 'i20',
    car2: 'Aura',
    dimension: 'all',
  },
  {
    title: 'Powertrains & Engines',
    desc: 'Displacement, PS power, Nm torque, transmissions & ARAI mileage',
    car1: 'Alcazar',
    car2: 'Creta',
    dimension: 'engines',
  },
  {
    title: 'Safety Suites & Airbags',
    desc: 'Standard 6 airbags, ESC, HAC, TPMS & body construction',
    car1: 'i20',
    car2: 'Aura',
    dimension: 'safety',
  },
]

const dimensionOptions = [
  { value: 'all', label: 'Full Technical Comparison (All Specs)' },
  { value: 'engines', label: 'Powertrains, Power, Torque & Mileage' },
  { value: 'dimensions', label: 'Dimensions, Boot Space & Wheelbase' },
  { value: 'safety', label: 'Safety Suite, Airbags & Structural Tech' },
  { value: 'variants', label: 'Trims, Equipment & Key Features' },
]

export default function ComparePage() {
  const [models, setModels] = useState(['Alcazar', 'Creta', 'i20', 'Aura'])
  const [carA, setCarA] = useState('Alcazar')
  const [carB, setCarB] = useState('Creta')
  const [dimension, setDimension] = useState('all')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [sources, setSources] = useState([])
  const abortRef = useRef(null)

  useEffect(() => {
    api.get('/api/documents/models')
      .then((res) => {
        if (res.data?.length > 0) {
          setModels(res.data)
          setCarA(res.data[0])
          setCarB(res.data[1] || res.data[0])
        }
      })
      .catch(() => {})
  }, [])

  async function handleCompare(presetCarA, presetCarB, presetDim) {
    const selectedA = presetCarA || carA
    const selectedB = presetCarB || carB
    const selectedDim = presetDim || dimension

    if (presetCarA) setCarA(presetCarA)
    if (presetCarB) setCarB(presetCarB)
    if (presetDim) setDimension(presetDim)

    setLoading(true)
    setResult('')
    setSources([])

    let prompt = ''
    if (selectedDim === 'engines') {
      prompt = `Compare the engines, power output, torque, transmission options, and fuel efficiency between Hyundai ${selectedA} and Hyundai ${selectedB}. Provide a clear side-by-side comparison table followed by a summary.`
    } else if (selectedDim === 'dimensions') {
      prompt = `Compare dimensions (length, width, height, wheelbase), boot space, fuel tank, and seating capacity between Hyundai ${selectedA} and Hyundai ${selectedB}. Provide a clear side-by-side comparison table.`
    } else if (selectedDim === 'safety') {
      prompt = `Compare safety features, airbag count, ESC, HAC, TPMS, and braking between Hyundai ${selectedA} and Hyundai ${selectedB}. Provide a structured side-by-side comparison table.`
    } else {
      prompt = `Provide a comprehensive side-by-side comparison table between Hyundai ${selectedA} and Hyundai ${selectedB} covering segment, engines, power, torque, transmissions, fuel efficiency, dimensions, boot space, key tech, and safety. Summarize key differences.`
    }

    try {
      // Create session
      const sessionRes = await api.post('/api/chat/sessions', {
        title: `Compare ${selectedA} vs ${selectedB}`,
      })
      const sessionId = sessionRes.data.id

      const controller = new AbortController()
      abortRef.current = controller

      await streamMessage(
        sessionId,
        { content: prompt },
        {
          onToken: (token) => {
            setResult((prev) => prev + token)
          },
          onSources: (srcs) => {
            setSources(srcs || [])
          },
          onDone: (data) => {
            setResult(data.content)
            setLoading(false)
          },
          onError: (err) => {
            toast.error(typeof err === 'string' ? err : 'Comparison failed.')
            setLoading(false)
          },
        },
        controller.signal
      )
    } catch (err) {
      toast.error(errorMessage(err))
      setLoading(false)
    }
  }

  function copyComparison() {
    if (!result) return
    navigator.clipboard.writeText(result)
    toast.success('Comparison markdown copied to clipboard!')
  }

  return (
    <Shell
      title="Vehicle Comparison Matrix"
      description="Compare specifications, dimensions, and powertrains side-by-side with verified brochure grounding."
    >
      <div className="space-y-8">
        {/* Comparison Selector Card */}
        <Card className="border-accent/20 bg-surface shadow-sm">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-4">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                Vehicle A
              </label>
              <Select
                value={carA}
                onChange={(e) => setCarA(e.target.value)}
                options={models.map((m) => ({ value: m, label: `Hyundai ${m}` }))}
              />
            </div>

            <div className="hidden lg:grid place-items-center h-11 w-11 shrink-0 rounded-full bg-accent-tint text-accent">
              <ArrowLeftRight className="h-5 w-5" />
            </div>

            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                Vehicle B
              </label>
              <Select
                value={carB}
                onChange={(e) => setCarB(e.target.value)}
                options={models.map((m) => ({ value: m, label: `Hyundai ${m}` }))}
              />
            </div>

            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                Comparison Scope
              </label>
              <Select
                value={dimension}
                onChange={(e) => setDimension(e.target.value)}
                options={dimensionOptions}
              />
            </div>

            <div className="shrink-0">
              <Button
                onClick={() => handleCompare()}
                loading={loading}
                className="w-full lg:w-auto font-semibold px-6"
              >
                <Sparkles className="h-4 w-4 mr-1.5" /> Run Comparison
              </Button>
            </div>
          </div>
        </Card>

        {/* 1-Click Comparison Presets */}
        <div>
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-muted mb-3">
            Quick Comparison Presets
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {comparisonPresets.map((preset) => (
              <button
                key={preset.title}
                onClick={() => handleCompare(preset.car1, preset.car2, preset.dimension)}
                disabled={loading}
                className="group flex flex-col text-left rounded-[12px] border border-line bg-surface p-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:border-accent hover:shadow-sm disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-heading text-sm font-bold text-navy group-hover:text-accent">
                    {preset.title}
                  </span>
                  <ArrowLeftRight className="h-3.5 w-3.5 text-muted group-hover:text-accent" />
                </div>
                <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                  {preset.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Comparison Results Area */}
        {result ? (
          <div className="rounded-[16px] border border-line bg-surface p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 mb-5">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-navy text-white font-heading font-bold text-sm">
                  H
                </span>
                <div>
                  <h3 className="font-heading text-base font-bold text-navy">
                    {carA} vs {carB} Comparison
                  </h3>
                  <p className="text-xs text-muted">
                    Official Brochure Verified Specifications
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {sources.length > 0 && (
                  <Badge status="accent">
                    {sources.length} sources cited
                  </Badge>
                )}
                <Button size="sm" variant="secondary" onClick={copyComparison} className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" /> Copy Matrix
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setResult('')
                    setSources([])
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              </div>
            </div>

            {/* Markdown Comparison Table Rendering */}
            <div className="answer">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }) => (
                    <div className="table-scroll-wrapper w-full">
                      <div className="table-scroll-hint">
                        <span>↔ Scroll right to compare all specifications</span>
                        <span>Official Grounded Data</span>
                      </div>
                      <div className="table-scroll" data-lenis-prevent>
                        <table>{children}</table>
                      </div>
                    </div>
                  ),
                }}
              >
                {result}
              </ReactMarkdown>
            </div>
          </div>
        ) : loading ? (
          <div className="rounded-[16px] border border-line bg-surface p-8 text-center space-y-4">
            <div className="inline-flex items-center gap-2 text-accent font-semibold text-sm">
              <span className="pulse-dot h-2 w-2 rounded-full bg-accent" />
              Retrieving Hyundai {carA} & {carB} brochures from pgvector knowledge base...
            </div>
            <div className="space-y-3 max-w-xl mx-auto">
              <div className="shimmer h-10 rounded-[8px]" />
              <div className="shimmer h-10 rounded-[8px]" />
              <div className="shimmer h-10 rounded-[8px]" />
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Car}
            title="Select Vehicles to Compare"
            body="Choose any two Hyundai models above or click a quick comparison preset to view side-by-side engine specs, dimensions, and variant features."
          />
        )}
      </div>
    </Shell>
  )
}
