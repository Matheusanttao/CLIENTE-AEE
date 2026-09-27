import { Check, X } from 'lucide-react'
import { cn } from '../utils/cn'
import { formatDateTime } from '../utils/format'

const statusStyles: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pagamento pendente', className: 'bg-[#fffaeb] text-[#b54708]' },
  aprovado: { label: 'Pagamento aprovado', className: 'bg-[#ecfdf3] text-[#067647]' },
  preparando: { label: 'Preparando envio', className: 'bg-brand-mint text-brand-hover' },
  enviado: { label: 'Enviado', className: 'bg-brand-mint text-brand-hover' },
  entregue: { label: 'Entregue', className: 'bg-[#ecfdf3] text-[#067647]' },
  recusado: { label: 'Pagamento recusado', className: 'bg-danger/10 text-danger' },
  cancelado: { label: 'Cancelado', className: 'bg-danger/10 text-danger' },
}

/** Selo de status do pedido (cores semanticas discretas). */
export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  const style = statusStyles[status] ?? { label: status, className: 'bg-surface text-muted' }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        style.className,
        className,
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {style.label}
    </span>
  )
}

type TimelineOrder = {
  status: string
  criado_em: string
  etiqueta_gerada_em?: string | null
  postado_em?: string | null
  entregue_em?: string | null
}

type TimelineStep = {
  title: string
  description?: string
  date?: string | null
  reached: boolean
  tone?: 'danger'
}

const progressRank: Record<string, number> = {
  pendente: 0,
  aprovado: 1,
  preparando: 2,
  enviado: 3,
  entregue: 4,
}

function buildSteps(order: TimelineOrder): TimelineStep[] {
  if (order.status === 'cancelado' || order.status === 'recusado') {
    return [
      { title: 'Pedido realizado', date: order.criado_em, reached: true },
      {
        title: order.status === 'cancelado' ? 'Pedido cancelado' : 'Pagamento recusado',
        reached: true,
        tone: 'danger',
      },
    ]
  }

  const rank = progressRank[order.status] ?? 0
  return [
    { title: 'Pedido realizado', date: order.criado_em, reached: true },
    { title: 'Pagamento aprovado', reached: rank >= 1 },
    {
      title: 'Em preparação',
      description: order.etiqueta_gerada_em ? 'Etiqueta de envio gerada' : undefined,
      date: order.etiqueta_gerada_em,
      reached: rank >= 2 || Boolean(order.etiqueta_gerada_em),
    },
    { title: 'Pedido enviado', date: order.postado_em, reached: rank >= 3 || Boolean(order.postado_em) },
    { title: 'Pedido entregue', date: order.entregue_em, reached: rank >= 4 || Boolean(order.entregue_em) },
  ]
}

/** Linha do tempo do pedido, com as etapas concluidas em azul. */
export function OrderTimeline({ order, className }: { order: TimelineOrder; className?: string }) {
  const steps = buildSteps(order)
  const currentIndex = steps.reduce((last, step, index) => (step.reached ? index : last), 0)

  return (
    <ol className={cn('grid', className)}>
      {steps.map((step, index) => {
        const done = index <= currentIndex
        const current = index === currentIndex
        const danger = step.tone === 'danger'
        const isLast = index === steps.length - 1

        return (
          <li key={step.title} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  'absolute bottom-0 left-[13px] top-7 w-0.5 rounded-full',
                  index < currentIndex ? 'bg-brand' : 'bg-line',
                )}
              />
            )}
            <span
              className={cn(
                'relative grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition',
                danger
                  ? 'border-danger bg-danger text-white'
                  : done
                    ? 'border-brand bg-brand text-white'
                    : 'border-line bg-white text-muted',
                current && !danger && 'ring-4 ring-brand/15',
              )}
            >
              {danger ? (
                <X size={14} strokeWidth={3} />
              ) : done ? (
                <Check size={14} strokeWidth={3} />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-line" />
              )}
            </span>
            <div className="min-w-0 pt-0.5">
              <p
                className={cn(
                  'text-sm font-semibold',
                  danger ? 'text-danger' : done ? 'text-ink' : 'text-muted',
                )}
              >
                {step.title}
                <span className="sr-only">{done ? ' (concluído)' : ' (pendente)'}</span>
              </p>
              {step.description && <p className="mt-0.5 text-xs text-muted">{step.description}</p>}
              {step.date && <p className="mt-0.5 text-xs text-muted">{formatDateTime(step.date)}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
