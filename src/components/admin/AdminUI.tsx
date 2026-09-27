import type { ReactNode } from 'react'
import type { OrderStatus } from '../../types'
import { cn } from '../../utils/cn'
import { adminOrderStatusLabels, adminOrderStatusTone } from './adminStyles'

export function AdminCard({
  children,
  className,
  padding = 'md',
}: {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'none'
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-line bg-white shadow-card',
        padding === 'sm' && 'p-3 sm:p-4',
        padding === 'md' && 'p-4 sm:p-5',
        padding === 'lg' && 'p-5 sm:p-6',
        padding === 'none' && 'p-0',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function AdminSectionHeader({
  title,
  description,
  action,
  flush = false,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  /** Remove a margem inferior (quando o pai ja controla o espacamento com gap). */
  flush?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-3', !flush && 'mb-4', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function AdminListRow({
  children,
  className,
  muted = false,
}: {
  children: ReactNode
  className?: string
  /** Fundo cinza claro para itens inativos/ocultos. */
  muted?: boolean
}) {
  return (
    <div
      className={cn(
        'grid gap-3 rounded-xl border border-line px-3.5 py-3 transition hover:border-[#D0D5DD] hover:shadow-card sm:px-4',
        muted ? 'bg-surface/50' : 'bg-white',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Rotulo + campo. Use as="div" quando o conteudo tiver mais de um controle clicavel. */
export function AdminField({
  label,
  hint,
  required,
  optional,
  className,
  as = 'label',
  children,
}: {
  label: string
  hint?: ReactNode
  required?: boolean
  optional?: boolean
  className?: string
  as?: 'label' | 'div'
  children: ReactNode
}) {
  const Wrapper = as
  return (
    <Wrapper className={cn('grid min-w-0 content-start gap-1.5', className)}>
      <span className="text-sm font-medium text-ink">
        {label}
        {required && <span className="text-danger"> *</span>}
        {optional && <span className="font-normal text-muted"> (opcional)</span>}
      </span>
      {children}
      {hint && <span className="text-xs leading-relaxed text-muted">{hint}</span>}
    </Wrapper>
  )
}

/** Bloco de formulario com titulo, usado nas telas de produto e configuracoes. */
export function AdminFormSection({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn('rounded-2xl border border-line bg-white p-4 sm:p-5', className)}>
      <AdminSectionHeader title={title} description={description} action={action} />
      {children}
    </section>
  )
}

export function AdminEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-line bg-surface/50 px-4 py-12 text-center">
      {icon && (
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-muted ring-1 ring-line">
          {icon}
        </span>
      )}
      <p className={cn('text-sm font-semibold text-ink', icon && 'mt-3')}>{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function AdminStatusBadge({ status }: { status: OrderStatus }) {
  const tone = adminOrderStatusTone[status] ?? adminOrderStatusTone.cancelado
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        tone.badge,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} aria-hidden />
      {adminOrderStatusLabels[status] ?? status}
    </span>
  )
}

export function AdminPill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'brand' | 'success' | 'warning'
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        tone === 'neutral' && 'bg-surface text-muted ring-line',
        tone === 'brand' && 'bg-brand-mint text-brand-hover ring-brand-soft',
        tone === 'success' && 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
        tone === 'warning' && 'bg-amber-50 text-amber-800 ring-amber-200/80',
      )}
    >
      {children}
    </span>
  )
}

/** Interruptor liga/desliga com rotulo e descricao opcional. */
export function AdminToggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-line bg-white px-4 py-3 text-left transition hover:border-[#D0D5DD] hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-brand' : 'bg-muted/30',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  )
}
