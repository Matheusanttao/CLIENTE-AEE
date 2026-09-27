import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, LoaderCircle, Radio, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AdminCard } from '../components/admin/AdminUI'
import { Button, Select, Skeleton, useConfirm, useToast } from '../components/ui'
import { orderStatusLabels, orderStatuses } from '../lib/constants'
import { registerSuperFreteWebhook } from '../services/mercadopago'
import { adminCancelOrder, getAllOrders, updateOrderStatus } from '../services/orders'
import type { Order, OrderStatus } from '../types'
import { formatAddressLine, formatCurrency, formatDate } from '../utils/format'

interface AdminOrder extends Order {
  enderecos?: Order['enderecos']
  usuarios?: { nome: string; email: string } | null
}

export function AdminOrdersPage() {
  const { notify } = useToast()
  const { confirm } = useConfirm()
  const queryClient = useQueryClient()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [activatingTracking, setActivatingTracking] = useState(true)
  const [trackingActive, setTrackingActive] = useState(true)
  const trackingActivationStarted = useRef(false)

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: getAllOrders,
  })

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      setUpdatingId(orderId)
      await updateOrderStatus(orderId, status)
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      notify('Status atualizado')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao atualizar status', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleCancel = async (order: AdminOrder) => {
    const willRefund = order.status === 'aprovado' || order.status === 'preparando'
    const ok = await confirm({
      title: willRefund ? 'Cancelar e estornar pedido' : 'Cancelar pedido',
      message: willRefund
        ? `O pagamento de ${formatCurrency(order.total)} sera estornado ao cliente e os itens voltarao ao estoque. Deseja continuar?`
        : 'A cobranca pendente sera cancelada. Deseja continuar?',
      confirmLabel: willRefund ? 'Cancelar e estornar' : 'Cancelar pedido',
      tone: 'danger',
    })
    if (!ok) return

    try {
      setUpdatingId(order.id)
      const result = await adminCancelOrder(order.id)
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      notify(result?.paymentAction === 'refunded' ? 'Pedido cancelado e pagamento estornado' : 'Pedido cancelado')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao cancelar pedido', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleActivateTracking = useCallback(async () => {
    try {
      setActivatingTracking(true)
      await registerSuperFreteWebhook()
      setTrackingActive(true)
    } catch (error) {
      setTrackingActive(false)
      notify(error instanceof Error ? error.message : 'Erro ao ativar rastreamento', 'error')
    } finally {
      setActivatingTracking(false)
    }
  }, [notify])

  useEffect(() => {
    if (trackingActivationStarted.current) return
    trackingActivationStarted.current = true
    void handleActivateTracking()
  }, [handleActivateTracking])

  return (
    <div className="grid gap-3">
      <AdminCard className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-bold text-ink">Rastreamento SuperFrete</p>
          <p className="mt-1 text-sm text-muted">
            Receba automaticamente etiqueta, postagem, entrega e codigo de rastreio.
          </p>
        </div>
        {trackingActive ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
            <CheckCircle2 size={16} />
            Sempre ativo
          </span>
        ) : !activatingTracking ? (
          <Button onClick={() => void handleActivateTracking()}>
            <Radio size={16} />
            Tentar novamente
          </Button>
        ) : null}
      </AdminCard>

      {isLoading && <Skeleton className="h-32 rounded-2xl" />}

      <div className="grid gap-3">
        {(orders as AdminOrder[]).map((order) => (
          <AdminCard key={order.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">
                  #{order.id.slice(0, 8)}
                </p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">
                  {formatCurrency(order.total)}
                </p>
                <p className="mt-1 text-sm text-muted">{formatDate(order.criado_em)}</p>
              </div>
              <div className="grid min-w-[200px] gap-2">
                <Select
                  value={order.status}
                  disabled={updatingId === order.id}
                  onChange={(event) => handleStatusChange(order.id, event.target.value as OrderStatus)}
                >
                  {orderStatuses.filter((status) => status !== 'cancelado').map((status) => (
                    <option key={status} value={status}>
                      {orderStatusLabels[status]}
                    </option>
                  ))}
                  {order.status === 'cancelado' && <option value="cancelado">Cancelado</option>}
                </Select>
                {(['pendente', 'aprovado', 'preparando'] as OrderStatus[]).includes(order.status) && (
                  <Button
                    variant="danger"
                    className="rounded-xl px-4 py-2"
                    disabled={updatingId === order.id}
                    onClick={() => void handleCancel(order)}
                  >
                    {updatingId === order.id ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <RotateCcw size={16} />
                    )}
                    {order.status === 'pendente' ? 'Cancelar pedido' : 'Cancelar e estornar'}
                  </Button>
                )}
                <span className="text-xs text-muted">MP: {order.mp_payment_id ?? '—'}</span>
              </div>
            </div>

            <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-2xl bg-[#f7f8f5] p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Cliente</h3>
                <p className="mt-2 font-semibold text-ink">{order.usuarios?.nome ?? '—'}</p>
                <p className="text-muted">{order.usuarios?.email ?? '—'}</p>
              </div>
              <div className="rounded-2xl bg-[#f7f8f5] p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Entrega</h3>
                {order.enderecos ? (
                  <>
                    <p className="mt-2 font-semibold text-ink">{order.enderecos.nome_destinatario}</p>
                    <p className="text-muted">{formatAddressLine(order.enderecos)}</p>
                    {order.frete_servico && (
                      <p className="mt-2 text-muted">
                        {order.frete_servico} — {order.frete_transportadora}
                      </p>
                    )}
                  </>
                ) : order.endereco_snapshot ? (
                  <>
                    <p className="mt-2 font-semibold text-ink">{order.endereco_snapshot.nome_destinatario}</p>
                    <p className="text-muted">
                      {order.endereco_snapshot.rua}, {order.endereco_snapshot.numero} -{' '}
                      {order.endereco_snapshot.bairro}, {order.endereco_snapshot.cidade}/
                      {order.endereco_snapshot.estado}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-muted">Endereco nao informado</p>
                )}
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-[#f7f8f5] p-4 text-sm">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Itens</h3>
              <ul className="mt-2 grid gap-1 text-ink/80">
                {order.itens_pedido?.map((item, index) => (
                  <li key={index}>
                    {item.quantidade}x {item.produtos?.nome ?? 'Produto'}
                    {'sabor_nome' in item && item.sabor_nome ? ` — ${item.sabor_nome}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          </AdminCard>
        ))}
      </div>

      {!isLoading && orders.length === 0 && (
        <AdminCard className="py-12 text-center">
          <p className="text-sm text-muted">Nenhum pedido registrado.</p>
        </AdminCard>
      )}
    </div>
  )
}
