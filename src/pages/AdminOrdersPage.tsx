import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, LoaderCircle, MapPin, Package, Radio, RotateCcw, ShoppingBag, Truck, User } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AdminCard, AdminEmptyState, AdminStatusBadge } from '../components/admin/AdminUI'
import { adminButtonClass, adminOrderStatusLabels } from '../components/admin/adminStyles'
import { Button, Select, useConfirm, useToast } from '../components/ui'
import { orderStatuses } from '../lib/constants'
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
        ? `O pagamento de ${formatCurrency(order.total)} será estornado ao cliente e os itens voltarão ao estoque. Deseja continuar?`
        : 'A cobrança pendente será cancelada. Deseja continuar?',
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

  const typedOrders = orders as AdminOrder[]

  return (
    <div className="grid gap-4 sm:gap-5">
      <AdminCard className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-mint text-brand">
            <Truck size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold text-ink">Rastreamento SuperFrete</p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted">
              Receba automaticamente etiqueta, postagem, entrega e código de rastreio.
            </p>
          </div>
        </div>
        {trackingActive ? (
          <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200/80">
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

      {!isLoading && typedOrders.length > 0 && (
        <p className="px-1 text-sm text-muted">
          {typedOrders.length} {typedOrders.length === 1 ? 'pedido registrado' : 'pedidos registrados'}
        </p>
      )}

      {isLoading && (
        <div className="grid gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-2xl border border-line bg-white" />
          ))}
        </div>
      )}

      <div className="grid gap-4">
        {typedOrders.map((order) => {
          const busy = updatingId === order.id
          const cancellable = (['pendente', 'aprovado', 'preparando'] as OrderStatus[]).includes(order.status)
          return (
            <AdminCard key={order.id} padding="none">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-4 sm:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">Pedido #{order.id.slice(0, 8)}</p>
                    <AdminStatusBadge status={order.status} />
                  </div>
                  <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-ink">
                    {formatCurrency(order.total)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {formatDate(order.criado_em)}
                    <span className="mx-1.5" aria-hidden>·</span>
                    Mercado Pago: {order.mp_payment_id ?? '—'}
                  </p>
                </div>
                <div className="grid w-full gap-2 sm:w-[260px]">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted">Alterar status</span>
                    <Select
                      value={order.status}
                      disabled={busy}
                      onChange={(event) => handleStatusChange(order.id, event.target.value as OrderStatus)}
                    >
                      {orderStatuses.filter((status) => status !== 'cancelado').map((status) => (
                        <option key={status} value={status}>
                          {adminOrderStatusLabels[status]}
                        </option>
                      ))}
                      {order.status === 'cancelado' && <option value="cancelado">Cancelado</option>}
                    </Select>
                  </label>
                  {cancellable && (
                    <button
                      type="button"
                      className={adminButtonClass('danger', 'sm', 'w-full')}
                      disabled={busy}
                      onClick={() => void handleCancel(order)}
                    >
                      {busy ? <LoaderCircle size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                      {order.status === 'pendente' ? 'Cancelar pedido' : 'Cancelar e estornar'}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-3 p-4 text-sm sm:p-5 md:grid-cols-2 xl:grid-cols-3">
                <InfoBlock icon={<User size={15} />} title="Cliente">
                  <p className="font-semibold text-ink">{order.usuarios?.nome ?? '—'}</p>
                  <p className="break-all text-muted">{order.usuarios?.email ?? '—'}</p>
                </InfoBlock>

                <InfoBlock icon={<MapPin size={15} />} title="Entrega">
                  {order.enderecos ? (
                    <>
                      <p className="font-semibold text-ink">{order.enderecos.nome_destinatario}</p>
                      <p className="text-muted">{formatAddressLine(order.enderecos)}</p>
                      {order.frete_servico && (
                        <p className="mt-2 text-muted">
                          {order.frete_servico} — {order.frete_transportadora}
                        </p>
                      )}
                    </>
                  ) : order.endereco_snapshot ? (
                    <>
                      <p className="font-semibold text-ink">{order.endereco_snapshot.nome_destinatario}</p>
                      <p className="text-muted">
                        {order.endereco_snapshot.rua}, {order.endereco_snapshot.numero} -{' '}
                        {order.endereco_snapshot.bairro}, {order.endereco_snapshot.cidade}/
                        {order.endereco_snapshot.estado}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted">Endereço não informado</p>
                  )}
                </InfoBlock>

                <InfoBlock icon={<Package size={15} />} title="Itens" className="md:col-span-2 xl:col-span-1">
                  <ul className="grid gap-1.5">
                    {order.itens_pedido?.map((item, index) => (
                      <li key={index} className="flex gap-2 text-ink">
                        <span className="shrink-0 font-semibold tabular-nums">{item.quantidade}x</span>
                        <span className="min-w-0">
                          {item.produtos?.nome ?? 'Produto'}
                          {'sabor_nome' in item && item.sabor_nome ? (
                            <span className="text-muted"> · Variação: {item.sabor_nome}</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </InfoBlock>
              </div>
            </AdminCard>
          )
        })}
      </div>

      {!isLoading && typedOrders.length === 0 && (
        <AdminCard>
          <AdminEmptyState
            icon={<ShoppingBag size={20} />}
            title="Nenhum pedido registrado"
            description="Os pedidos feitos na loja aparecem aqui, com status, cliente e entrega."
          />
        </AdminCard>
      )}
    </div>
  )
}

function InfoBlock({
  icon,
  title,
  className,
  children,
}: {
  icon: ReactNode
  title: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`rounded-xl bg-surface p-4 ${className ?? ''}`}>
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  )
}
