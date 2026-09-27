/* eslint-disable react-refresh/only-export-components */
import { ArrowRight, X } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../utils/cn'

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-brand text-white shadow-sm hover:bg-brand-hover',
        variant === 'secondary' && 'border border-line bg-white text-ink hover:border-[#d0d5dd] hover:bg-surface',
        variant === 'ghost' && 'bg-transparent text-ink hover:bg-surface',
        variant === 'danger' && 'bg-danger text-white shadow-sm hover:bg-[#b42318]',
        className,
      )}
      {...props}
    />
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand/15',
        className,
      )}
      {...props}
    />
  )
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15',
        className,
      )}
      {...props}
    />
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'promo' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        tone === 'neutral' && 'bg-surface text-muted',
        tone === 'success' && 'bg-[#ecfdf3] text-[#067647]',
        tone === 'promo' && 'bg-brand-soft text-brand-hover',
      )}
    >
      {children}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-surface', className)} />
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface/60 px-6 py-12 text-center">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>
    </div>
  )
}

/** Cabecalho padrao das secoes da loja (titulo, descricao opcional e link "Ver todos"). */
export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: { label: string; to: string }
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-x-6 gap-y-3', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-sm font-semibold text-brand">{eyebrow}</p>}
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {action && (
        <Link
          to={action.to}
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand transition hover:text-brand-hover"
        >
          {action.label}
          <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}

export function Modal({
  open,
  title,
  children,
  onClose,
  size = 'md',
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  if (!open) return null

  const width =
    size === 'sm'
      ? 'max-w-md'
      : size === 'lg'
        ? 'max-w-3xl'
        : size === 'xl'
          ? 'max-w-5xl'
          : 'max-w-lg'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={cn(
          'flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-soft sm:rounded-3xl',
          width,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">{title}</h2>
          <button
            type="button"
            aria-label="Fechar modal"
            className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-surface hover:text-ink"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">{children}</div>
      </div>
    </div>
  )
}

export function Rating({ value }: { value: number }) {
  return <span className="text-sm font-semibold text-amber-500">{'★'.repeat(Math.round(value)) || '☆'} {value.toFixed(1)}</span>
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-10 flex items-center justify-center gap-3">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Anterior
      </Button>
      <span className="text-sm text-muted">
        Página {page} de {totalPages}
      </span>
      <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Próxima
      </Button>
    </div>
  )
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

const ToastContext = createContext<
  { notify: (message: string, type?: Toast['type'], durationMs?: number) => void } | undefined
>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const notify = useCallback((message: string, type: Toast['type'] = 'success', durationMs = 3500) => {
    const id = Date.now()
    setToasts((current) => [...current, { id, message, type }])
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), durationMs)
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-4 top-4 z-[60] grid justify-items-end gap-3 sm:left-auto">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-sm font-medium shadow-soft sm:w-auto sm:min-w-72',
              toast.type === 'success' ? 'bg-ink text-white' : 'bg-danger text-white',
            )}
          >
            {toast.message}
            <button aria-label="Fechar" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast precisa estar dentro de ToastProvider')
  return context
}

type ConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
}

type ConfirmState = ConfirmOptions & {
  resolve: (value: boolean) => void
}

const ConfirmContext = createContext<{ confirm: (options: ConfirmOptions | string) => Promise<boolean> } | undefined>(
  undefined,
)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const normalized: ConfirmOptions = typeof options === 'string' ? { message: options } : options
    return new Promise<boolean>((resolve) => {
      setState({
        title: normalized.title ?? 'Confirmar',
        message: normalized.message,
        confirmLabel: normalized.confirmLabel ?? 'Confirmar',
        cancelLabel: normalized.cancelLabel ?? 'Cancelar',
        tone: normalized.tone ?? 'danger',
        resolve,
      })
    })
  }, [])

  const close = (value: boolean) => {
    state?.resolve(value)
    setState(null)
  }

  const value = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-ink/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => close(false)}
        >
          <div
            className="w-full max-w-md animate-float-up rounded-2xl border border-line bg-white p-6 shadow-soft"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-ink">{state.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{state.message}</p>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                className="rounded-full p-2 text-muted transition hover:bg-surface hover:text-ink"
                onClick={() => close(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => close(false)}>
                {state.cancelLabel}
              </Button>
              <Button
                type="button"
                variant={state.tone === 'danger' ? 'danger' : 'primary'}
                onClick={() => close(true)}
              >
                {state.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error('useConfirm precisa estar dentro de ConfirmProvider')
  return context
}
