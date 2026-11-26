import { useState } from 'react'
import {
  ArrowRight,
  Car,
  CheckCircle2,
  Download,
  FileText,
  Filter,
  Info,
  MoreVertical,
  Search,
  Sparkles,
  Trash2
} from 'lucide-react'
import Shell from '../components/Shell'
import {
  Avatar,
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
  Progress,
  Select,
  Skeleton,
  TabContent,
  Tabs,
  TextArea,
  TextInput,
  Tooltip
} from '../components/ui'

export default function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [textVal, setTextVal] = useState('')
  const [selectVal, setSelectVal] = useState('alcazar')
  const [tabVal, setTabVal] = useState('components')

  return (
    <Shell
      title="Design System & Components"
      description="Automotive SaaS UI tokens, atomic components, and layout primitives."
    >
      <div className="space-y-12 pb-16">
        {/* Color Palette Tokens */}
        <section>
          <div className="mb-4">
            <h2 className="font-heading text-xl font-bold text-navy">Brand & System Tokens</h2>
            <p className="text-xs text-muted">Core 4-color palette, semantic feedback tokens, and contrast ratios.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="rounded-[10px] border border-line bg-surface p-3 shadow-xs">
              <div className="h-14 rounded-[6px] bg-[#101b2d] mb-2 shadow-xs" />
              <p className="font-heading text-xs font-bold text-navy">Navy</p>
              <p className="text-[11px] text-muted">#101B2D (Brand)</p>
            </div>
            <div className="rounded-[10px] border border-line bg-surface p-3 shadow-xs">
              <div className="h-14 rounded-[6px] bg-[#263445] mb-2 shadow-xs" />
              <p className="font-heading text-xs font-bold text-navy">Graphite</p>
              <p className="text-[11px] text-muted">#263445 (Body)</p>
            </div>
            <div className="rounded-[10px] border border-line bg-surface p-3 shadow-xs">
              <div className="h-14 rounded-[6px] bg-[#0066cc] mb-2 shadow-xs" />
              <p className="font-heading text-xs font-bold text-navy">Accent</p>
              <p className="text-[11px] text-muted">#0066CC (Interactive)</p>
            </div>
            <div className="rounded-[10px] border border-line bg-surface p-3 shadow-xs">
              <div className="h-14 rounded-[6px] bg-[#f5f7fa] border border-line mb-2 shadow-xs" />
              <p className="font-heading text-xs font-bold text-navy">Canvas</p>
              <p className="text-[11px] text-muted">#F5F7FA (Base)</p>
            </div>
            <div className="rounded-[10px] border border-line bg-surface p-3 shadow-xs">
              <div className="h-14 rounded-[6px] bg-[#16a34a] mb-2 shadow-xs" />
              <p className="font-heading text-xs font-bold text-navy">Success</p>
              <p className="text-[11px] text-muted">#16A34A (Verified)</p>
            </div>
            <div className="rounded-[10px] border border-line bg-surface p-3 shadow-xs">
              <div className="h-14 rounded-[6px] bg-[#d97706] mb-2 shadow-xs" />
              <p className="font-heading text-xs font-bold text-navy">Warning</p>
              <p className="text-[11px] text-muted">#D97706 (Notice)</p>
            </div>
            <div className="rounded-[10px] border border-line bg-surface p-3 shadow-xs">
              <div className="h-14 rounded-[6px] bg-[#dc2626] mb-2 shadow-xs" />
              <p className="font-heading text-xs font-bold text-navy">Danger</p>
              <p className="text-[11px] text-muted">#DC2626 (Error)</p>
            </div>
          </div>
        </section>

        {/* Buttons and Interactive Elements */}
        <section>
          <div className="mb-4">
            <h2 className="font-heading text-xl font-bold text-navy">Button Variants & Sizes</h2>
            <p className="text-xs text-muted">WCAG AA 44px min touch target, focus rings, and active state micro-transitions.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary Action</Button>
            <Button variant="secondary">Secondary Outline</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="danger">Danger Action</Button>
            <Button loading>Processing</Button>
            <Button size="sm">Small (36px)</Button>
            <Button size="lg">Large (48px)</Button>
            <Tooltip content="Quick action tooltip">
              <Button variant="secondary" className="gap-1.5">
                <Info className="h-4 w-4" /> Tooltip Target
              </Button>
            </Tooltip>
          </div>
        </section>

        {/* Status Badges */}
        <section>
          <div className="mb-4">
            <h2 className="font-heading text-xl font-bold text-navy">Status & Verification Badges</h2>
            <p className="text-xs text-muted">Pulsing states for async indexing, verified brochures, and errors.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge status="UPLOADED" />
            <Badge status="PROCESSING" />
            <Badge status="COMPLETED" />
            <Badge status="FAILED" />
            <Badge status="accent">11 Citations</Badge>
            <Badge status="default">Sub-4 Meter</Badge>
          </div>
        </section>

        {/* Form Inputs & Selects */}
        <section>
          <div className="mb-4">
            <h2 className="font-heading text-xl font-bold text-navy">Form Controls & Validation</h2>
            <p className="text-xs text-muted">Custom styled inputs with 44px height, floating/inline errors, and no browser autofill tint.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="Vehicle Model" hint="Official Hyundai nameplate">
              <TextInput
                placeholder="e.g. Alcazar 2024"
                value={textVal}
                onChange={(e) => setTextVal(e.target.value)}
              />
            </Field>

            <Field label="Powertrain Filter">
              <Select
                value={selectVal}
                onChange={(e) => setSelectVal(e.target.value)}
                options={[
                  { value: 'alcazar', label: '1.5L Turbo GDi Petrol / 1.5L U2 CRDi Diesel' },
                  { value: 'creta', label: '1.5L MPi / 1.5L Turbo GDi' },
                  { value: 'i20', label: '1.2L Kappa Petrol (Manual & IVT)' },
                  { value: 'aura', label: '1.2L Bi-Fuel Petrol + CNG' },
                ]}
              />
            </Field>

            <Field label="Inline Error State" error="Please enter a valid displacement in cc.">
              <TextInput defaultValue="abc" invalid />
            </Field>
          </div>
        </section>

        {/* Cards & Elevation */}
        <section>
          <div className="mb-4">
            <h2 className="font-heading text-xl font-bold text-navy">Cards & Elevation</h2>
            <p className="text-xs text-muted">Elevation tokens: subtle, soft, raised, and micro-hover lift (-2px).</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card>
              <h3 className="font-heading text-base font-bold text-navy">Standard Card</h3>
              <p className="mt-1 text-xs text-muted">Subtle elevation for clean dashboard widgets and layout groupings.</p>
            </Card>

            <Card hoverable>
              <div className="flex items-center justify-between mb-2">
                <span className="font-heading text-base font-bold text-navy">Hover Lift Card</span>
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <p className="text-xs text-muted">2px translateY with smooth shadow transition for interactive prompt cards.</p>
            </Card>

            <Card className="border-accent/30 bg-accent-tint/30">
              <h3 className="font-heading text-base font-bold text-navy">Featured / Highlight Card</h3>
              <p className="mt-1 text-xs text-graphite">Accent-tinted border for recommendations and primary results.</p>
            </Card>
          </div>
        </section>

        {/* Tabs, Dropdowns & Modals */}
        <section>
          <div className="mb-4">
            <h2 className="font-heading text-xl font-bold text-navy">Overlays & Navigation</h2>
            <p className="text-xs text-muted">Radix UI accessible primitives with smooth animations and focus trap.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button onClick={() => setModalOpen(true)}>Open Modal Dialog</Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Open Confirm Dialog
            </Button>

            <Menu
              trigger={
                <Button variant="secondary" className="gap-2">
                  <span>Dropdown Menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              }
            >
              <MenuItem icon={Download} onSelect={() => alert('Download selected')}>
                Download Brochure
              </MenuItem>
              <MenuItem icon={FileText} onSelect={() => alert('View chunks')}>
                Inspect Chunks
              </MenuItem>
              <MenuItem icon={Trash2} danger onSelect={() => alert('Delete selected')}>
                Delete File
              </MenuItem>
            </Menu>

            <div className="flex items-center gap-2">
              <Avatar name="Kedar S" size="lg" />
              <div>
                <p className="text-xs font-semibold text-navy">Kedar S</p>
                <p className="text-[11px] text-muted">Senior Sales Desk</p>
              </div>
            </div>
          </div>
        </section>

        {/* Progress & File Dropzone */}
        <section>
          <div className="mb-4">
            <h2 className="font-heading text-xl font-bold text-navy">File Dropzone & Ingestion Progress</h2>
            <p className="text-xs text-muted">Document upload component with drag states and real-time processing indicator.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FileDropzone onFileSelected={(f) => alert(`Selected file: ${f.name}`)} />
            <div className="flex flex-col justify-center space-y-4 rounded-[12px] border border-line bg-surface p-6">
              <div>
                <div className="flex justify-between text-xs font-semibold text-navy mb-1.5">
                  <span>Embedding Alcazar_2024.pdf</span>
                  <span>72%</span>
                </div>
                <Progress value={72} />
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold text-navy mb-1.5">
                  <span>pgvector Vector Storage Sync</span>
                  <span>100%</span>
                </div>
                <Progress value={100} />
              </div>
            </div>
          </div>
        </section>

        {/* Feedback & Skeleton States */}
        <section>
          <div className="mb-4">
            <h2 className="font-heading text-xl font-bold text-navy">Empty, Error & Skeleton States</h2>
            <p className="text-xs text-muted">Polished edge cases for resilient dealership workflows.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <EmptyState
              icon={Car}
              title="No Models Selected"
              body="Choose two Hyundai nameplates from the selectors above to generate a side-by-side spec sheet."
              action={<Button size="sm">Select Vehicles</Button>}
            />
            <ErrorState
              title="Brochure Sync Interrupted"
              body="Could not reach the vector retrieval service. Check connection."
              onRetry={() => {}}
            />
            <div className="rounded-[12px] border border-line bg-surface p-5 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-10 w-1/2 mt-4" />
            </div>
          </div>
        </section>
      </div>

      {/* Modal Dialog */}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Vehicle Specification Guide"
        description="Official brochure data points for dealership inquiries."
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-graphite">
            Every specification displayed in this interface has been extracted and grounded in verified Hyundai Motor India PDF brochures.
          </p>
          <div className="rounded-[8px] bg-canvas p-3 border border-line text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted">Document:</span>
              <span className="font-semibold text-navy">Hyundai i20 2024 Official Guide</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Page:</span>
              <span className="font-semibold text-navy">Page 1, Section 3</span>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setModalOpen(false)}>Dismiss</Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Hyundai Brochure"
        body="Are you sure you want to delete this brochure? Indexed vectors and citations will be removed permanently."
        confirmLabel="Delete Brochure"
        onConfirm={() => setConfirmOpen(false)}
      />
    </Shell>
  )
}
