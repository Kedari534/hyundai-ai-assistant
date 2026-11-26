import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Car,
  Check,
  CheckCircle2,
  FileText,
  Fuel,
  Gauge,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import Shell from '../components/Shell'
import { Badge, Button, Card, Progress } from '../components/ui'
import api, { errorMessage, streamMessage } from '../lib/api'

const steps = [
  { id: 1, title: 'Body & Seating', desc: 'Space requirements' },
  { id: 2, title: 'Driving Context', desc: 'Primary road usage' },
  { id: 3, title: 'Powertrain', desc: 'Engine & fuel choice' },
  { id: 4, title: 'Key Priorities', desc: 'Must-have features' },
]

const seatingOptions = [
  {
    id: 'hatchback',
    title: '5-Passenger Premium Hatchback',
    model: 'i20',
    desc: 'Agile city parking, widest cabin in segment (1 775 mm), 311L boot space.',
  },
  {
    id: 'sedan',
    title: '5-Passenger Sub-4m Sedan',
    model: 'Aura',
    desc: 'Spacious 402L boot, high fuel efficiency, comfortable family seating.',
  },
  {
    id: 'compact-suv',
    title: '5-Passenger Compact SUV',
    model: 'Creta',
    desc: 'Commanding road presence, high ground clearance, premium comfort.',
  },
  {
    id: 'suv-3row',
    title: '6 / 7 Passenger Premium 3-Row SUV',
    model: 'Alcazar',
    desc: 'Captain seats or 7-seat versatility, large luggage space, extended wheelbase.',
  },
]

const drivingOptions = [
  {
    id: 'city',
    title: 'Daily City Commute',
    desc: 'Stop-and-go urban traffic, tight parking spaces, focus on light steering and automatic convenience.',
  },
  {
    id: 'highway',
    title: 'Highway Touring & Long Trips',
    desc: 'High-speed stability, cruise control, comfortable seating posture, and long-distance endurance.',
  },
  {
    id: 'mixed',
    title: 'Balanced City & Weekend Getaways',
    desc: 'Daily office runs during weekdays with occasional weekend family road trips.',
  },
]

const powertrainOptions = [
  {
    id: 'petrol-auto',
    title: 'Petrol Automatic (IVT / DCT / AMT)',
    desc: 'Smooth clutchless shifting, effortless commuting in traffic.',
  },
  {
    id: 'petrol-manual',
    title: '1.2L / 1.5L Petrol Manual',
    desc: 'Punchy throttle response, low upfront acquisition cost, driver engagement.',
  },
  {
    id: 'diesel',
    title: '1.5L CRDi Diesel',
    desc: 'High torque at low RPM, exceptional highway mileage, low running cost for high running.',
  },
  {
    id: 'cng',
    title: 'Factory-Fitted Bi-Fuel CNG',
    desc: 'Industry-leading 28.0 km/kg fuel economy, lowest cost per kilometer.',
  },
]

const priorityOptions = [
  { id: 'mileage', label: 'Maximum Fuel Efficiency / Mileage' },
  { id: 'safety', label: 'Standard 6 Airbags & High-Strength Body' },
  { id: 'boot', label: 'Large Boot Space (> 400 Litres)' },
  { id: 'tech', label: '10.25-inch Touchscreen & Bose Premium Audio' },
  { id: 'sunroof', label: 'Voice-Enabled Electric Sunroof' },
  { id: 'seats', label: '6-Seater with Captain Seats' },
]

export default function RecommendPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [seating, setSeating] = useState('suv-3row')
  const [driving, setDriving] = useState('mixed')
  const [powertrain, setPowertrain] = useState('petrol-auto')
  const [priorities, setPriorities] = useState(['safety', 'tech'])

  const [loading, setLoading] = useState(false)
  const [recommendation, setRecommendation] = useState('')
  const [sources, setSources] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const abortRef = useRef(null)

  function togglePriority(id) {
    setPriorities((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  async function handleGenerate() {
    setLoading(true)
    setRecommendation('')
    setSources([])

    const selectedSeating = seatingOptions.find((o) => o.id === seating)?.title
    const selectedDriving = drivingOptions.find((o) => o.id === driving)?.title
    const selectedPowertrain = powertrainOptions.find((o) => o.id === powertrain)?.title
    const selectedPriorities = priorities
      .map((p) => priorityOptions.find((item) => item.id === p)?.label)
      .join(', ')

    const prompt = `Act as an expert Hyundai Dealership Consultant. Based on the customer's requirements, recommend the best Hyundai vehicle from our official brochures:
- Seating & Body Style: ${selectedSeating}
- Primary Usage: ${selectedDriving}
- Powertrain & Fuel: ${selectedPowertrain}
- Key Priority Features: ${selectedPriorities}

Structure your answer with:
1. Executive Recommendation (name the recommended model and variant)
2. Confirmed Brochure Specifications table
3. Why this model fits the customer's driving profile
4. Key trade-offs or alternative options from the Hyundai lineup.`

    try {
      const sessionRes = await api.post('/api/chat/sessions', {
        title: `Recommendation: ${seatingOptions.find((o) => o.id === seating)?.model || 'Car'} Advisor`,
      })
      const id = sessionRes.data.id
      setSessionId(id)

      const controller = new AbortController()
      abortRef.current = controller

      await streamMessage(
        id,
        { content: prompt },
        {
          onToken: (token) => {
            setRecommendation((prev) => prev + token)
          },
          onSources: (srcs) => {
            setSources(srcs || [])
          },
          onDone: (data) => {
            setRecommendation(data.content)
            setLoading(false)
          },
          onError: (err) => {
            toast.error(typeof err === 'string' ? err : 'Recommendation failed.')
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

  function handleReset() {
    setRecommendation('')
    setSources([])
    setSessionId(null)
    setStep(1)
  }

  return (
    <Shell
      title="Car Advisor Wizard"
      description="Interactive consultative wizard to recommend the ideal Hyundai model based on customer needs."
    >
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Step Indicator Bar */}
        <div className="rounded-[14px] border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            {steps.map((s, index) => {
              const active = step === s.id
              const completed = step > s.id
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition-colors ${
                        active
                          ? 'bg-accent text-white shadow-sm'
                          : completed
                          ? 'bg-success text-white'
                          : 'bg-slate-100 text-muted'
                      }`}
                    >
                      {completed ? <Check className="h-4 w-4" /> : s.id}
                    </span>
                    <div className="hidden sm:block">
                      <p className={`text-xs font-bold ${active ? 'text-navy' : 'text-muted'}`}>
                        {s.title}
                      </p>
                      <p className="text-[10px] text-muted">{s.desc}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 mx-3 h-0.5 bg-line hidden sm:block" />
                  )}
                </div>
              )
            })}
          </div>
          <Progress value={(step / 4) * 100} className="mt-3.5" />
        </div>

        {/* Wizard Question Steps */}
        {!recommendation && !loading && (
          <Card className="p-6 md:p-8">
            {step === 1 && (
              <div>
                <div className="mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-accent">
                    Step 1 of 4
                  </span>
                  <h2 className="font-heading text-xl font-bold text-navy mt-1">
                    Select Body Style & Seating Capacity
                  </h2>
                  <p className="text-xs text-muted">
                    Who will be riding in the vehicle most frequently?
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {seatingOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSeating(opt.id)}
                      className={`flex flex-col text-left rounded-[12px] p-4.5 border transition-all ${
                        seating === opt.id
                          ? 'border-accent bg-accent-tint/40 shadow-sm ring-1 ring-accent'
                          : 'border-line bg-surface hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-heading text-sm font-bold text-navy">
                          {opt.title}
                        </span>
                        <span className="rounded bg-navy/10 px-2 py-0.5 text-[11px] font-bold text-navy">
                          {opt.model}
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-accent">
                    Step 2 of 4
                  </span>
                  <h2 className="font-heading text-xl font-bold text-navy mt-1">
                    Primary Driving Environment
                  </h2>
                  <p className="text-xs text-muted">
                    Where will the vehicle cover most of its kilometers?
                  </p>
                </div>

                <div className="space-y-3.5">
                  {drivingOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDriving(opt.id)}
                      className={`w-full flex items-start gap-3.5 rounded-[12px] p-4 border text-left transition-all ${
                        driving === opt.id
                          ? 'border-accent bg-accent-tint/40 shadow-sm ring-1 ring-accent'
                          : 'border-line bg-surface hover:border-slate-300'
                      }`}
                    >
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-tint text-accent mt-0.5">
                        <Car className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-heading text-sm font-bold text-navy">
                          {opt.title}
                        </h3>
                        <p className="text-xs text-muted mt-1 leading-relaxed">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-accent">
                    Step 3 of 4
                  </span>
                  <h2 className="font-heading text-xl font-bold text-navy mt-1">
                    Powertrain & Fuel Priority
                  </h2>
                  <p className="text-xs text-muted">
                    Choose the preferred engine characteristics and transmission.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {powertrainOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPowertrain(opt.id)}
                      className={`flex flex-col text-left rounded-[12px] p-4.5 border transition-all ${
                        powertrain === opt.id
                          ? 'border-accent bg-accent-tint/40 shadow-sm ring-1 ring-accent'
                          : 'border-line bg-surface hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2 text-accent">
                        <Fuel className="h-4 w-4" />
                        <span className="font-heading text-sm font-bold text-navy">
                          {opt.title}
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <div className="mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-accent">
                    Step 4 of 4
                  </span>
                  <h2 className="font-heading text-xl font-bold text-navy mt-1">
                    Key Features & Must-Haves
                  </h2>
                  <p className="text-xs text-muted">
                    Select the equipment highlights that matter most to the customer.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {priorityOptions.map((opt) => {
                    const selected = priorities.includes(opt.id)
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => togglePriority(opt.id)}
                        className={`flex items-center justify-between rounded-[10px] p-3.5 border transition-all text-left ${
                          selected
                            ? 'border-accent bg-accent-tint/40 ring-1 ring-accent'
                            : 'border-line bg-surface hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xs font-semibold text-navy">{opt.label}</span>
                        <div
                          className={`grid h-5 w-5 place-items-center rounded-full text-white text-[10px] ${
                            selected ? 'bg-accent' : 'border border-line'
                          }`}
                        >
                          {selected && <Check className="h-3 w-3 stroke-[2.5]" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
              <Button
                variant="ghost"
                disabled={step === 1}
                onClick={() => setStep((s) => Math.max(1, s - 1))}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Previous
              </Button>

              {step < 4 ? (
                <Button onClick={() => setStep((s) => Math.min(4, s + 1))}>
                  Next Step <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleGenerate} className="font-semibold px-6">
                  <Sparkles className="h-4 w-4 mr-1.5" /> Generate Official Recommendation
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="rounded-[16px] border border-line bg-surface p-10 text-center space-y-4">
            <div className="inline-flex items-center gap-2 text-accent font-semibold text-sm">
              <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-accent" />
              Synthesizing official Hyundai brochures to match customer criteria...
            </div>
            <div className="space-y-3 max-w-xl mx-auto pt-4">
              <div className="shimmer h-12 rounded-[10px]" />
              <div className="shimmer h-24 rounded-[10px]" />
              <div className="shimmer h-16 rounded-[10px]" />
            </div>
          </div>
        )}

        {/* Completed Recommendation View */}
        {recommendation && (
          <div className="space-y-6">
            <div className="rounded-[16px] border border-line bg-surface p-6 md:p-8 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-accent font-heading font-bold text-white shadow-sm">
                    H
                  </span>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-navy">
                      Hyundai Consultant Recommendation
                    </h3>
                    <p className="text-xs text-muted">
                      Tailored Match Based on Customer Driving Profile
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {sources.length > 0 && (
                    <Badge status="accent">
                      {sources.length} brochure sources cited
                    </Badge>
                  )}
                  {sessionId && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/chat/${sessionId}`)}
                      className="gap-1.5"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Continue in Chat
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={handleReset}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> New Recommendation
                  </Button>
                </div>
              </div>

              {/* Rendered Markdown Recommendation */}
              <div className="answer">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ children }) => (
                      <div className="table-scroll-wrapper w-full">
                        <div className="table-scroll-hint">
                          <span>↔ Scroll right to compare all specifications</span>
                          <span>Verified Brochure Facts</span>
                        </div>
                        <div className="table-scroll" data-lenis-prevent>
                          <table>{children}</table>
                        </div>
                      </div>
                    ),
                  }}
                >
                  {recommendation}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}
