import { forwardRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Dropdown from '@radix-ui/react-dropdown-menu'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { AlertCircle, CheckCircle2, ChevronDown, FileUp, Loader2, X } from 'lucide-react'

/* ==========================================================================
   BUTTON COMPONENT
   Variants: primary, secondary, ghost, danger, icon
   Sizes: sm, md (default 44px min), lg
   States: loading, disabled, focus-visible ring, active scale 0.98
   ========================================================================== */
const buttonVariants = {
  primary: 'bg-accent text-white hover:bg-accent-hover active:bg-accent-pressed shadow-sm',
  secondary: 'bg-surface text-ink border border-line hover:bg-canvas hover:border-slate-300 shadow-sm',
  ghost: 'text-ink hover:bg-black/5 active:bg-black/10',
  danger: 'bg-danger text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
  icon: 'text-ink hover:bg-black/5 active:bg-black/10 p-0',
}

const buttonSizes = {
  sm: 'min-h-[36px] h-9 px-3 text-xs',
  md: 'min-h-[44px] h-11 px-4 text-sm',
  lg: 'min-h-[48px] h-12 px-6 text-base font-semibold',
}

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={loading || disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-[8px] font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${buttonVariants[variant]} ${variant === 'icon' ? 'w-11 min-h-[44px]' : buttonSizes[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />}
      {children}
    </button>
  )
})

/* ==========================================================================
   INPUT & FORM FIELDS
   ========================================================================== */
export function Field({ label, error, hint, id, required, children, className = '' }) {
  return (
    <div className={`block ${className}`}>
      {label && (
        <label htmlFor={id} className="mb-1.5 flex items-center justify-between text-sm font-medium text-ink">
          <span>
            {label} {required && <span className="text-danger">*</span>}
          </span>
        </label>
      )}
      {children}
      {error && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {!error && hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export const TextInput = forwardRef(function TextInput({ invalid, className = '', ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`min-h-[44px] h-11 w-full rounded-[8px] border bg-surface px-3.5 text-sm text-ink transition-colors placeholder:text-muted/60 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:bg-slate-50 disabled:text-muted ${
        invalid ? 'border-danger focus-visible:ring-danger' : 'border-line hover:border-slate-300'
      } ${className}`}
      {...props}
    />
  )
})

export const TextArea = forwardRef(function TextArea({ invalid, className = '', rows = 3, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`w-full rounded-[8px] border bg-surface p-3 text-sm text-ink transition-colors placeholder:text-muted/60 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 resize-y disabled:bg-slate-50 disabled:text-muted ${
        invalid ? 'border-danger focus-visible:ring-danger' : 'border-line hover:border-slate-300'
      } ${className}`}
      {...props}
    />
  )
})

export const Select = forwardRef(function Select({ invalid, options = [], className = '', children, ...props }, ref) {
  return (
    <div className="relative w-full">
      <select
        ref={ref}
        className={`min-h-[44px] h-11 w-full appearance-none rounded-[8px] border bg-surface pl-3.5 pr-10 text-sm text-ink transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:bg-slate-50 ${
          invalid ? 'border-danger focus-visible:ring-danger' : 'border-line hover:border-slate-300'
        } ${className}`}
        {...props}
      >
        {children ||
          options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  )
})

/* ==========================================================================
   BADGE COMPONENT
   ========================================================================== */
const badgeThemes = {
  UPLOADED: 'bg-slate-100 text-graphite border border-slate-200',
  PROCESSING: 'bg-accent-tint text-accent border border-accent/20 font-semibold',
  COMPLETED: 'bg-success-tint text-success border border-success/20 font-semibold',
  FAILED: 'bg-danger-tint text-danger border border-danger/20 font-semibold',
  default: 'bg-slate-100 text-graphite border border-line',
  accent: 'bg-accent text-white font-medium',
}

export function Badge({ status = 'default', children, className = '' }) {
  const normalized = status.toUpperCase()
  const theme = badgeThemes[normalized] || badgeThemes.default
  const label = children || (status.charAt(0).toUpperCase() + status.slice(1).toLowerCase())

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${theme} ${className}`}>
      {normalized === 'PROCESSING' && (
        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
      )}
      {normalized === 'COMPLETED' && (
        <CheckCircle2 className="h-3 w-3 text-success shrink-0" aria-hidden="true" />
      )}
      {label}
    </span>
  )
}

/* ==========================================================================
   CARD COMPONENT
   ========================================================================== */
export function Card({ children, hoverable = false, className = '', ...props }) {
  return (
    <div
      className={`rounded-[12px] border border-line bg-surface p-5 shadow-[var(--shadow-subtle)] ${
        hoverable ? 'card-lift cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

/* ==========================================================================
   MODAL & CONFIRM DIALOG (Radix Dialog)
   ========================================================================== */
export function Modal({ open, onOpenChange, title, description, children, maxWidth = 'max-w-lg' }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/50 backdrop-blur-xs transition-opacity animate-fade-in" />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 z-50 w-[min(92vw,${maxWidth})] -translate-x-1/2 -translate-y-1/2 rounded-[16px] border border-line bg-surface p-6 shadow-[var(--shadow-raised)] outline-none animate-scale-up`}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-heading text-xl font-bold text-navy">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-muted hover:bg-canvas hover:text-ink transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function ConfirmDialog({ open, onOpenChange, title, body, confirmLabel = 'Confirm', onConfirm, loading }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={body} maxWidth="max-w-md">
      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button variant="danger" loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

/* ==========================================================================
   DROPDOWN MENU (Radix Dropdown)
   ========================================================================== */
export function Menu({ trigger, children, align = 'end' }) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          align={align}
          sideOffset={6}
          className="z-50 min-w-48 rounded-[12px] border border-line bg-surface p-1.5 shadow-[var(--shadow-raised)] outline-none"
        >
          {children}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  )
}

export function MenuItem({ onSelect, icon: Icon, children, danger = false, disabled = false }) {
  return (
    <Dropdown.Item
      onSelect={onSelect}
      disabled={disabled}
      className={`flex cursor-pointer items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-canvas disabled:pointer-events-none disabled:opacity-40 ${
        danger ? 'text-danger data-[highlighted]:bg-danger-tint' : 'text-ink'
      }`}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span>{children}</span>
    </Dropdown.Item>
  )
}

/* ==========================================================================
   TABS COMPONENT (Radix Tabs)
   ========================================================================== */
export function Tabs({ defaultValue, value, onValueChange, tabs = [], children, className = '' }) {
  return (
    <TabsPrimitive.Root
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      className={`w-full ${className}`}
    >
      {tabs.length > 0 && (
        <TabsPrimitive.List className="inline-flex h-11 items-center gap-1 rounded-[10px] bg-slate-100 p-1 text-muted">
          {tabs.map((tab) => (
            <TabsPrimitive.Trigger
              key={tab.value}
              value={tab.value}
              className="inline-flex min-h-[36px] items-center justify-center rounded-[8px] px-4 text-xs font-semibold text-muted transition-all data-[state=active]:bg-surface data-[state=active]:text-navy data-[state=active]:shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {tab.label}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>
      )}
      {children}
    </TabsPrimitive.Root>
  )
}

export const TabContent = TabsPrimitive.Content

/* ==========================================================================
   TOOLTIP COMPONENT (Radix Tooltip)
   ========================================================================== */
export function Tooltip({ content, children, side = 'top' }) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={4}
            className="z-50 rounded-[6px] bg-navy px-2.5 py-1 text-xs font-medium text-white shadow-md animate-fade-in"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-navy" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

/* ==========================================================================
   AVATAR COMPONENT
   ========================================================================== */
export function Avatar({ name = '', size = 'md', className = '' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-9 w-9 text-xs',
    lg: 'h-11 w-11 text-sm font-semibold',
  }

  return (
    <span
      className={`grid place-items-center rounded-full bg-accent-tint text-accent font-medium shrink-0 border border-accent/20 ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      {initials}
    </span>
  )
}

/* ==========================================================================
   PROGRESS BAR COMPONENT
   ========================================================================== */
export function Progress({ value = 0, max = 100, className = '' }) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)))
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div
        className="h-full bg-accent transition-all duration-300 ease-out"
        style={{ width: `${percentage}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      />
    </div>
  )
}

/* ==========================================================================
   FILE DROPZONE COMPONENT
   ========================================================================== */
export function FileDropzone({ onFileSelected, accept = '.pdf', disabled = false, className = '' }) {
  const [dragOver, setDragOver] = useState(false)

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file && onFileSelected) onFileSelected(file)
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file && onFileSelected) onFileSelected(file)
    e.target.value = ''
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center rounded-[12px] border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
        dragOver ? 'border-accent bg-accent-tint/30' : 'border-line bg-canvas hover:border-accent/50'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-accent-tint text-accent mb-3">
        <FileUp className="h-6 w-6" />
      </div>
      <p className="font-heading font-semibold text-ink">
        Click to upload or drag and drop
      </p>
      <p className="mt-1 text-xs text-muted">
        Official Hyundai vehicle brochures (PDF up to 25 MB)
      </p>
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={handleFileChange}
        className="sr-only"
      />
    </label>
  )
}

/* ==========================================================================
   EMPTY STATE & ERROR STATE
   ========================================================================== */
export function EmptyState({ icon: Icon, title, body, action, className = '' }) {
  return (
    <div
      className={`rounded-[12px] border border-dashed border-line bg-surface px-6 py-14 text-center ${className}`}
    >
      {Icon && (
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-canvas text-muted">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h2 className="font-heading text-xl font-bold text-navy">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', body, onRetry, className = '' }) {
  return (
    <div
      className={`rounded-[12px] border border-danger/20 bg-danger-tint/50 p-6 text-center ${className}`}
    >
      <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-danger-tint text-danger">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h3 className="font-heading text-base font-bold text-navy">{title}</h3>
      <p className="mt-1 text-xs text-graphite">{body}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

/* ==========================================================================
   SKELETON COMPONENT
   ========================================================================== */
export function Skeleton({ className = '' }) {
  return <div className={`shimmer rounded-[8px] ${className}`} />
}
