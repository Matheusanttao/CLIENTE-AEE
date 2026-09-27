import { ExternalLink, PackageSearch } from 'lucide-react'
import { useState } from 'react'
import { Seo } from '../components/Seo'
import { Button, EmptyState, Input, useToast } from '../components/ui'
import { orderStatusLabels } from '../lib/constants'
import { trackOrder, type TrackedOrder } from '../services/tracking'
import { formatCurrency, formatDate, formatDateTime } from '../utils/format'

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
      notify('Preencha o numero do pedido e o e-mail', 'error')
      return
    }

    try {
      setLoading(true)
      const result = await trackOrder(orderId, email)
      setOrder(result)
    } catch (error) {
      setOrder(null)
      notify(error instanceof Error ? error.message : 'Pedido nao encontrado', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Seo
        title="Rastrear pedido | Passarim Suplementos Betim"
        description="Acompanhe seu pedido da Passarim Suplementos em Betim com o numero do pedido e o e-mail da compra."
        path="/rastrear-pedido"
      />
      <section className="container max-w-2xl py-10">
        <div className="rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-brand text-black">
              <PackageSearch size={24} />
            </span>
            <div>
              <h1 className="text-3xl font-black text-black">Rastrear pedido</h1>
              <p className="text-sm text-gray-500">Informe o numero do pedido e o e-mail usado na compra.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
            <Input name="orderId" placeholder="Numero do pedido (ex: a1b2c3d4)" required />
            <Input name="email" type="email" placeholder="E-mail da compra" required />
            <Button type="submit" disabled={loading}>
              {loading ? 'Buscando...' : 'Rastrear pedido'}
            </Button>
          </form>

          {order && (
            <div className="mt-8 rounded-3xl bg-gray-50 p-6">
              <p className="text-sm text-gray-500">Pedido</p>
              <p className="text-2xl font-black text-black">#{order.id.slice(0, 8)}</p>
              <p className="mt-3 text-sm text-gray-600">
                Status:{' '}
                <strong className="text-black">
                  {orderStatusLabels[order.status as keyof typeof orderStatusLabels] ?? order.status}
                </strong>
              </p>
              <p className="mt-1 text-sm text-gray-600">Total: {formatCurrency(order.total)}</p>
              <p className="mt-1 text-sm text-gray-600">Data: {formatDate(order.criado_em)}</p>
              {order.frete_servico && (
                <p className="mt-3 text-sm text-gray-600">
                  Frete: {order.frete_servico} ({order.frete_transportadora}) - ate {order.frete_prazo_dias} dias uteis
                </p>
              )}
              {order.codigo_rastreio && (
                <div className="mt-5 rounded-2xl border border-brand/40 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Codigo de rastreio
                  </p>
                  <p className="mt-1 break-all text-lg font-black text-black">
                    {order.codigo_rastreio}
                  </p>
                  {order.url_rastreio && (
                    <a
                      href={order.url_rastreio}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 font-bold text-black underline"
                    >
                      Acompanhar entrega <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              )}
              {(order.etiqueta_gerada_em || order.postado_em || order.entregue_em) && (
                <div className="mt-5 grid gap-2 border-l-2 border-brand pl-4 text-sm text-gray-600">
                  {order.etiqueta_gerada_em && (
                    <p>Etiqueta gerada: {formatDateTime(order.etiqueta_gerada_em)}</p>
                  )}
                  {order.postado_em && <p>Pedido postado: {formatDateTime(order.postado_em)}</p>}
                  {order.entregue_em && <p>Pedido entregue: {formatDateTime(order.entregue_em)}</p>}
                </div>
              )}
            </div>
          )}

          {!order && !loading && (
            <div className="mt-8">
              <EmptyState
                title="Nenhum pedido consultado"
                description="Use o formulario acima para acompanhar sua entrega."
              />
            </div>
          )}
        </div>
      </section>
    </>
  )
}
