import type { OrderStatus } from '../../types'
import { cn } from '../../utils/cn'

type AdminButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type AdminButtonSize = 'sm' | 'md'

/**
 * Classes de botao do painel para elementos que nao sao <Button> (ex: <Link>, <label> de upload).
 * Seguem o mesmo visual do Button de components/ui.
 */
export function adminButtonClass(
  variant: AdminButtonVariant = 'secondary',
  size: AdminButtonSize = 'md',
  className?: string,
) {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20',
    'disabled:cursor-not-allowed disabled:opacity-50',
    size === 'sm' ? 'min-h-10 px-3.5 py-2 text-sm' : 'min-h-11 px-5 py-2.5 text-sm',
    variant === 'primary' && 'bg-brand text-white shadow-sm hover:bg-brand-hover',
    variant === 'secondary' && 'border border-line bg-white text-ink hover:border-[#D0D5DD] hover:bg-surface',
    variant === 'danger' && 'border border-line bg-white text-danger hover:border-red-200 hover:bg-red-50',
    variant === 'ghost' && 'text-muted hover:bg-surface hover:text-ink',
    className,
  )
}

/** Campo de texto multilinha no mesmo estilo do <Input>. */
export const adminTextareaClass =
  'w-full rounded-xl border border-line bg-white px-4 py-3 text-sm leading-relaxed text-ink outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand/15'

/** Rotulos curtos de status para o painel (a loja usa os textos de lib/constants). */
export const adminOrderStatusLabels: Record<OrderStatus, string> = {
  pendente: 'Pagamento pendente',
  aprovado: 'Pagamento aprovado',
  preparando: 'Preparando envio',
  recusado: 'Pagamento recusado',
  cancelado: 'Cancelado',
  enviado: 'Enviado',
  entregue: 'Entregue',
}

export const adminOrderStatusTone: Record<OrderStatus, { badge: string; dot: string }> = {
  pendente: { badge: 'bg-amber-50 text-amber-800 ring-amber-200/80', dot: 'bg-amber-500' },
  aprovado: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80', dot: 'bg-emerald-500' },
  preparando: { badge: 'bg-violet-50 text-violet-700 ring-violet-200/80', dot: 'bg-violet-500' },
  recusado: { badge: 'bg-red-50 text-red-700 ring-red-200/80', dot: 'bg-danger' },
  cancelado: { badge: 'bg-surface text-muted ring-line', dot: 'bg-muted' },
  enviado: { badge: 'bg-brand-mint text-brand-hover ring-brand-soft', dot: 'bg-brand' },
  entregue: { badge: 'bg-teal-50 text-teal-700 ring-teal-200/80', dot: 'bg-teal-500' },
}
