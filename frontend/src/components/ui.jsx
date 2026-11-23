import * as Dialog from '@radix-ui/react-dialog'
import * as Dropdown from '@radix-ui/react-dropdown-menu'
import { Loader2, X } from 'lucide-react'

const buttonStyles = {
  primary: 'bg-accent text-white hover:bg-accent-hover active:bg-accent-pressed',
  secondary: 'bg-surface text-ink border border-line hover:bg-canvas',
  ghost: 'text-ink hover:bg-black/5',
  danger: 'bg-danger text-white hover:bg-red-700',
  icon: 'text-ink hover:bg-black/5',
}

export function Button({ variant = 'primary', loading, className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] px-4 text-sm font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${buttonStyles[variant]} ${variant === 'icon' ? 'w-11 px-0' : ''} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

export function Field({ label, error, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-sm text-danger">{error}</span> : null}
      {!error && hint ? <span className="mt-1 block text-sm text-muted">{hint}</span> : null}
    </label>
  )
}

export function TextInput({ invalid, className = '', ...props }) {
  return (
    <input
      className={`h-11 w-full rounded-[8px] border bg-surface px-3 text-sm outline-none ${invalid ? 'border-danger' : 'border-line'} ${className}`}
      {...props}
    />
  )
}

export function TextArea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full resize-none rounded-[8px] border border-line bg-surface px-3 py-2 text-sm outline-none ${className}`}
      {...props}
    />
  )
}

const badgeStyles = {
  UPLOADED: 'bg-slate-100 text-graphite',
  PROCESSING: 'bg-accent-tint text-accent',
  COMPLETED: 'bg-success-tint text-success',
  FAILED: 'bg-danger-tint text-danger',
}

export function Badge({ status }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase()
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${badgeStyles[status] || badgeStyles.UPLOADED}`}>
      {status === 'PROCESSING' && <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />}
      {label}
    </span>
  )
}

export function Modal({ open, onOpenChange, title, description, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(480px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[16px] border border-line bg-surface p-6 shadow-[var(--shadow-raised)]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-heading text-xl text-ink">{title}</Dialog.Title>
              {description ? <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description> : null}
            </div>
            <Dialog.Close className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] hover:bg-canvas" aria-label="Close">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function ConfirmDialog({ open, onOpenChange, title, body, confirmLabel, onConfirm, loading }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={body}>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button variant="danger" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}

export function Menu({ trigger, children }) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className="z-30 min-w-44 rounded-[12px] border border-line bg-surface p-1 shadow-[var(--shadow-raised)]" sideOffset={6} align="end">
          {children}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  )
}

export function MenuItem({ onSelect, children, danger }) {
  return (
    <Dropdown.Item
      onSelect={onSelect}
      className={`cursor-pointer rounded-[8px] px-3 py-2 text-sm outline-none data-[highlighted]:bg-canvas ${danger ? 'text-danger' : 'text-ink'}`}
    >
      {children}
    </Dropdown.Item>
  )
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="rounded-[12px] border border-dashed border-line bg-surface px-6 py-16 text-center">
      <h2 className="font-heading text-2xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', body, onRetry }) {
  return (
    <div className="rounded-[12px] border border-danger/20 bg-danger-tint px-6 py-10 text-center">
      <h2 className="font-heading text-xl text-ink">{title}</h2>
      <p className="mt-2 text-sm text-graphite">{body}</p>
      {onRetry ? <Button className="mt-4" onClick={onRetry}>Try again</Button> : null}
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`shimmer h-4 rounded ${className}`} />
}
