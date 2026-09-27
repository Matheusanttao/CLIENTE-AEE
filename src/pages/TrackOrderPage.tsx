import { ExternalLink, Info, LoaderCircle, PackageSearch, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { OrderStatusBadge, OrderTimeline } from '../components/AccountOrderStatus'
import { Seo } from '../components/Seo'
import { Button, Input, useToast } from '../components/ui'
import { trackOrder, type TrackedOrder } from '../services/tracking'
import { formatCurrency, formatDate } from '../utils/format'

export function TrackOrderPage() {
  const { notify } = useToast()
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<TrackedOrder | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const orderId = String(form.get('orderId') ?? '').trim()
    const email = String(form.get('email') ?? '').trim()

    if (!orderId || !email) {
      notify('Preencha o número do pedido e o e-mail', 'error')
      return
    }

    try {
      setLoading(true)
      const result = await trackOrder(orderId, email)
      setOrder(result)
    } catch (error) {
      setOrder(null)
      notify(error instanceof Error ? error.message : 'Pedido não encontrado', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Seo
        title="Rastrear pedido | A&E Total Mix"
        description="Acompanhe seu pedido na A&E Total Mix com o número do pedido e o e-mail usado na compra."
        path="/rastrear-pedido"
      />
      <section className="container max-w-2xl py-12 md:py-16">
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-mint text-brand">
            <PackageSearch size={26} />
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Rastrear pedido</h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted">
            Informe o número do pedido e o e-mail usado na compra para ver o andamento da entrega.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="track-order-id" className="text-sm font-medium text-ink">
                Número do pedido
              </label>
              <Input
                id="track-order-id"
                name="orderId"
                placeholder="Ex.: a1b2c3d4"
                autoComplete="off"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="track-email" className="text-sm font-medium text-ink">
                E-mail da compra
              </label>
              <Input
                id="track-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="voce@email.com"
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="mt-5 w-full">
            {loading ? <LoaderCircle size={18} className="animate-spin" /> : <Search size={18} />}
            {loading ? 'Buscando...' : 'Rastrear pedido'}
          </Button>
        </form>

        {order && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-medium text-muted">Pedido</p>
                <p className="text-lg font-bold tracking-tight text-ink">#{order.id.slice(0, 8)}</p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>

            <dl className="grid gap-4 border-b border-line px-5 py-4 text-sm sm:grid-cols-3 sm:px-6">
              <div>
                <dt className="text-xs font-medium text-muted">Data da compra</dt>
                <dd className="mt-0.5 font-semibold text-ink">{formatDate(order.criado_em)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted">Total</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-ink">{formatCurrency(order.total)}</dd>
              </div>
              {order.frete_servico && (
                <div>
                  <dt className="text-xs font-medium text-muted">Frete</dt>
                  <dd className="mt-0.5 font-semibold text-ink">
                    {order.frete_servico}
                    {order.frete_transportadora ? ` (${order.frete_transportadora})` : ''}
                  </dd>
                  {order.frete_prazo_dias != null && (
                    <dd className="mt-0.5 text-xs text-muted">
                      Até {order.frete_prazo_dias} {order.frete_prazo_dias === 1 ? 'dia útil' : 'dias úteis'}
                    </dd>
                  )}
                </div>
              )}
            </dl>

            <div className="px-5 py-5 sm:px-6">
              {order.codigo_rastreio && (
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-soft bg-brand-mint px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted">Código de rastreio</p>
                    <p className="mt-0.5 break-all font-semibold text-ink">{order.codigo_rastreio}</p>
                  </div>
                  {order.url_rastreio && (
                    <a
                      href={order.url_rastreio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-hover"
                    >
                      Acompanhar entrega <ExternalLink size={15} />
                    </a>
                  )}
                </div>
              )}
              <h2 className="text-sm font-semibold text-ink">Andamento</h2>
              <OrderTimeline order={order} className="mt-4" />
            </div>
          </div>
        )}

        {!order && !loading && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-surface px-5 py-4 text-sm leading-relaxed text-muted">
            <Info size={18} className="mt-0.5 shrink-0 text-brand" />
            <p>
              Use os 8 primeiros caracteres do número do pedido (ex.: a1b2c3d4). Se você tem conta, o número
              aparece em{' '}
              <Link
                to="/minha-conta/pedidos"
                className="font-semibold text-brand transition-colors hover:text-brand-hover"
              >
                Minha conta › Pedidos
              </Link>
              .
            </p>
          </div>
        )}
      </section>
    </>
  )
}
