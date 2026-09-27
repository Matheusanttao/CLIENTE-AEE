import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CreditCard,
  ExternalLink,
  Eye,
  LoaderCircle,
  MessageCircle,
  QrCode,
  RefreshCw,
  X,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { MercadoPagoCardBrick } from '../components/MercadoPagoCardBrick'
import { PixPaymentPanel } from '../components/PixPaymentPanel'
import { Button, EmptyState, Modal, Skeleton, useConfirm, useToast } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { optimizeCloudinaryUrl } from '../lib/cloudinary'
import { fallbackProductImage, orderStatusLabels } from '../lib/constants'
import {
  checkPaymentStatus,
  processPayment,
  resumePayment,
  type ResumePaymentResult,
} from '../services/mercadopago'
import { cancelMyOrder, getMyOrders } from '../services/orders'
import type { Order } from '../types'
import { buildWhatsappUrl } from '../types/settings'
import { formatAddressLine, formatCurrency, formatDate, formatDateTime } from '../utils/format'

const RETURN_REQUEST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

function isReturnRequestAvailable(order: Order) {
  if (order.status !== 'entregue' || !order.entregue_em) return false

  const deliveredAt = Date.parse(order.entregue_em)
  return Number.isFinite(deliveredAt) && Date.now() <= deliveredAt + RETURN_REQUEST_WINDOW_MS
}

export function OrdersPage() {
  const { user } = useAuth()
  const { settings } = useSiteSettings()
  const { notify } = useToast()
  const { confirm } = useConfirm()
  const queryClient = useQueryClient()
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: () => getMyOrders(user?.id ?? ''),
    enabled: Boolean(user),
  })

  const [payingOrderId, setPayingOrderId] = useState<string | null>(null)
  const [checkingOrderId, setCheckingOrderId] = useState<string | null>(null)
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)
  const [pixModal, setPixModal] = useState<{
    orderId: string
    pix: NonNullable<ResumePaymentResult['pix']>
  } | null>(null)
  const [cardModalOrder, setCardModalOrder] = useState<Order | null>(null)
  const [cardPaying, setCardPaying] = useState(false)
  const [boletoUrl, setBoletoUrl] = useState<string | null>(null)
  const [detailsModalOrder, setDetailsModalOrder] = useState<Order | null>(null)

  const refreshOrders = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['my-orders', user?.id] })
  }, [queryClient, user?.id])

  const handlePixApproved = useCallback(() => {
    notify('Pagamento confirmado!', 'success')
    setPixModal(null)
    void refreshOrders()
  }, [notify, refreshOrders])

  const handlePayPix = async (order: Order) => {
    try {
      setPayingOrderId(order.id)
      const result = await resumePayment(order.id, 'pix')

      if (result.orderStatus === 'aprovado') {
        notify('Pagamento confirmado!', 'success')
        await refreshOrders()
        return
      }

      if (result.pix) {
        setPixModal({ orderId: order.id, pix: result.pix })
        return
      }

      notify('Nao foi possivel abrir o Pix. Tente novamente.', 'error')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao abrir pagamento', 'error')
      await refreshOrders()
    } finally {
      setPayingOrderId(null)
    }
  }

  const handleCheckPayment = async (order: Order) => {
    try {
      setCheckingOrderId(order.id)
      const result = await checkPaymentStatus(order.id)
      if (result.orderStatus === 'aprovado') {
        notify('Pagamento confirmado!', 'success')
      } else {
        notify(
          'Ainda nao identificamos o pagamento. Se ja pagou, aguarde alguns segundos e tente de novo.',
        )
      }
      await refreshOrders()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao verificar pagamento', 'error')
    } finally {
      setCheckingOrderId(null)
    }
  }

  const handleCancelOrder = async (order: Order) => {
    const ok = await confirm({
      title: 'Cancelar pedido?',
      message: `O pedido #${order.id.slice(0, 8)} sera cancelado e nao podera ser pago depois.`,
      confirmLabel: 'Sim, cancelar',
      cancelLabel: 'Voltar',
      tone: 'danger',
    })
    if (!ok) return

    try {
      setCancellingOrderId(order.id)
      await cancelMyOrder(order.id)
      notify('Pedido cancelado', 'success')
      if (pixModal?.orderId === order.id) setPixModal(null)
      if (cardModalOrder?.id === order.id) setCardModalOrder(null)
      await refreshOrders()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao cancelar pedido', 'error')
      await refreshOrders()
    } finally {
      setCancellingOrderId(null)
    }
  }

  const handleReturnRequest = (order: Order) => {
    if (!settings.whatsapp_number.trim()) {
      notify('O WhatsApp da loja ainda nao foi configurado.', 'error')
      return
    }

    const message = `Olá! Quero pedir a devolução do pedido #${order.id.slice(0, 8)}.`
    window.open(
      buildWhatsappUrl(settings.whatsapp_number, message),
      '_blank',
      'noopener,noreferrer',
    )
  }

  const handleCardBrickSubmit = async (formData: Record<string, unknown>) => {
    if (!cardModalOrder) return
    try {
      setCardPaying(true)
      const result = await processPayment(cardModalOrder.id, formData)

      if (result.orderStatus === 'aprovado') {
        notify('Pagamento confirmado!', 'success')
        setCardModalOrder(null)
        await refreshOrders()
        return
      }

      if (result.boletoUrl) {
        setBoletoUrl(result.boletoUrl)
        setCardModalOrder(null)
        await refreshOrders()
        return
      }

      if (result.pix) {
        setCardModalOrder(null)
        setPixModal({ orderId: cardModalOrder.id, pix: result.pix })
        return
      }

      if (result.orderStatus === 'pendente') {
        notify('Pagamento em analise. Atualizaremos o pedido em breve.', 'success')
        setCardModalOrder(null)
        await refreshOrders()
        return
      }

      notify('Pagamento nao aprovado. Verifique os dados e tente novamente.', 'error')
      await refreshOrders()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao processar pagamento', 'error')
      throw error
    } finally {
      setCardPaying(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Meus pedidos - {settings.store_name}</title>
      </Helmet>
      <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black text-black">Meus pedidos</h1>
        <p className="mt-2 text-sm text-gray-500">Acompanhe o status das suas compras.</p>

        {isLoading && <Skeleton className="mt-6 h-32" />}
        {!isLoading && orders.length === 0 && (
          <div className="mt-6">
            <EmptyState
              title="Nenhum pedido ainda"
              description="Seus pedidos aparecerao aqui apos o checkout."
            />
          </div>
        )}

        <div className="mt-6 grid gap-3">
          {orders.map((order) => {
            const pending = order.status === 'pendente'
            const returnRequestAvailable = isReturnRequestAvailable(order)
            const busy =
              payingOrderId === order.id ||
              cancellingOrderId === order.id ||
              checkingOrderId === order.id

            return (
              <div key={order.id} className="rounded-2xl bg-gray-50 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="font-bold text-black">#{order.id.slice(0, 8)}</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
                <p className="mt-1 text-gray-500">
                  {orderStatusLabels[order.status as keyof typeof orderStatusLabels] ?? order.status}{' '}
                  - {formatDate(order.criado_em)}
                </p>
                {order.metodo_pagamento === 'pix' && order.desconto_pix ? (
                  <p className="mt-1 text-green-700">
                    Desconto Pix: {formatCurrency(order.desconto_pix)}
                  </p>
                ) : null}
                {(order.enderecos || order.endereco_snapshot) && (
                  <p className="mt-2 text-gray-600">
                    Entrega:{' '}
                    {order.enderecos
                      ? formatAddressLine(order.enderecos)
                      : order.endereco_snapshot
                        ? `${order.endereco_snapshot.rua}, ${order.endereco_snapshot.numero}${
                            order.endereco_snapshot.complemento
                              ? `, ${order.endereco_snapshot.complemento}`
                              : ''
                          } - ${order.endereco_snapshot.bairro}, ${order.endereco_snapshot.cidade}/${order.endereco_snapshot.estado}`
                        : ''}
                  </p>
                )}
                {order.frete_servico && (
                  <p className="mt-1 text-gray-500">
                    Frete: {order.frete_servico} ({order.frete_transportadora})
                  </p>
                )}
                {order.codigo_rastreio && (
                  <div className="mt-3 rounded-2xl border border-brand/40 bg-white p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Codigo de rastreio
                    </p>
                    <p className="mt-1 break-all font-black text-black">{order.codigo_rastreio}</p>
                    {order.url_rastreio && (
                      <a
                        href={order.url_rastreio}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-2 font-bold text-black underline"
                      >
                        Acompanhar entrega <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                )}
                {order.itens_pedido && order.itens_pedido.length > 0 && (
                  <ul className="mt-2 grid gap-1 text-gray-600">
                    {order.itens_pedido.map((item, index) => (
                      <li key={index}>
                        {item.quantidade}x {item.produtos?.nome ?? 'Produto'}
                        {item.sabor_nome ? ` — ${item.sabor_nome}` : ''}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    className="rounded-2xl px-4 py-2.5"
                    onClick={() => setDetailsModalOrder(order)}
                  >
                    <Eye size={16} />
                    Ver detalhes
                  </Button>
                  {returnRequestAvailable && (
                    <Button
                      className="rounded-2xl px-4 py-2.5"
                      onClick={() => handleReturnRequest(order)}
                    >
                      <MessageCircle size={16} />
                      Pedir devolução
                    </Button>
                  )}
                </div>

                {pending && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-semibold text-amber-900">
                      Pagamento pendente — finalize para confirmar o pedido.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        className="rounded-2xl px-4 py-2.5"
                        disabled={busy}
                        onClick={() => void handlePayPix(order)}
                      >
                        {payingOrderId === order.id ? (
                          <LoaderCircle size={16} className="animate-spin" />
                        ) : (
                          <QrCode size={16} />
                        )}
                        {payingOrderId === order.id ? 'Abrindo...' : 'Pagar com Pix'}
                      </Button>
                      <Button
                        variant="secondary"
                        className="rounded-2xl px-4 py-2.5"
                        disabled={busy}
                        onClick={() => setCardModalOrder(order)}
                      >
                        <CreditCard size={16} />
                        Cartao / Boleto
                      </Button>
                      {order.mp_payment_id && (
                        <Button
                          variant="secondary"
                          className="rounded-2xl px-4 py-2.5"
                          disabled={busy}
                          onClick={() => void handleCheckPayment(order)}
                        >
                          {checkingOrderId === order.id ? (
                            <LoaderCircle size={16} className="animate-spin" />
                          ) : (
                            <RefreshCw size={16} />
                          )}
                          {checkingOrderId === order.id ? 'Verificando...' : 'Ja paguei'}
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        className="rounded-2xl px-4 py-2.5"
                        disabled={busy}
                        onClick={() => void handleCancelOrder(order)}
                      >
                        {cancellingOrderId === order.id ? (
                          <LoaderCircle size={16} className="animate-spin" />
                        ) : (
                          <X size={16} />
                        )}
                        {cancellingOrderId === order.id ? 'Cancelando...' : 'Cancelar pedido'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Modal
        open={Boolean(detailsModalOrder)}
        onClose={() => setDetailsModalOrder(null)}
        title="Detalhes do pedido"
        size="lg"
      >
        {detailsModalOrder && (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
              <div>
                <p className="font-bold text-ink">Pedido #{detailsModalOrder.id.slice(0, 8)}</p>
                <p className="mt-1 text-sm text-muted">
                  Compra realizada em {formatDateTime(detailsModalOrder.criado_em)}
                </p>
              </div>
              <span className="rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-ink">
                {orderStatusLabels[
                  detailsModalOrder.status as keyof typeof orderStatusLabels
                ] ?? detailsModalOrder.status}
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              {(detailsModalOrder.itens_pedido ?? []).map((item, index) => {
                const image =
                  [...(item.produtos?.imagens_produtos ?? [])].sort(
                    (a, b) => a.ordem - b.ordem,
                  )[0]?.url ?? fallbackProductImage

                return (
                  <div
                    key={index}
                    className="flex gap-4 rounded-2xl border border-line bg-white p-3"
                  >
                    <img
                      src={optimizeCloudinaryUrl(image, 240)}
                      alt={item.produtos?.nome ?? 'Produto do pedido'}
                      className="h-24 w-24 shrink-0 rounded-xl bg-surface object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink">{item.produtos?.nome ?? 'Produto'}</p>
                      {item.sabor_nome && (
                        <p className="mt-1 text-sm text-muted">Sabor: {item.sabor_nome}</p>
                      )}
                      <p className="mt-1 text-sm text-muted">
                        {item.quantidade} {item.quantidade === 1 ? 'unidade' : 'unidades'} ×{' '}
                        {formatCurrency(item.preco_unitario)}
                      </p>
                      <p className="mt-2 font-bold text-ink">
                        {formatCurrency(item.quantidade * item.preco_unitario)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-5 grid gap-2 border-t border-line pt-4 text-sm">
              {detailsModalOrder.codigo_rastreio && (
                <div className="mb-3 rounded-2xl bg-surface p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">
                    Codigo de rastreio
                  </p>
                  <p className="mt-1 break-all font-black text-ink">
                    {detailsModalOrder.codigo_rastreio}
                  </p>
                  {detailsModalOrder.url_rastreio && (
                    <a
                      href={detailsModalOrder.url_rastreio}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 font-bold text-ink underline"
                    >
                      Acompanhar entrega <ExternalLink size={15} />
                    </a>
                  )}
                  {detailsModalOrder.postado_em && (
                    <p className="mt-2 text-muted">
                      Postado em {formatDateTime(detailsModalOrder.postado_em)}
                    </p>
                  )}
                  {detailsModalOrder.entregue_em && (
                    <p className="mt-1 text-muted">
                      Entregue em {formatDateTime(detailsModalOrder.entregue_em)}
                    </p>
                  )}
                </div>
              )}
              <div className="flex justify-between gap-4 text-muted">
                <span>Subtotal</span>
                <span>{formatCurrency(detailsModalOrder.subtotal)}</span>
              </div>
              {detailsModalOrder.desconto > 0 && (
                <div className="flex justify-between gap-4 text-green-700">
                  <span>Desconto</span>
                  <span>- {formatCurrency(detailsModalOrder.desconto)}</span>
                </div>
              )}
              <div className="flex justify-between gap-4 text-muted">
                <span>Frete</span>
                <span>{formatCurrency(detailsModalOrder.frete)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-3 text-base font-black text-ink">
                <span>Total</span>
                <span>{formatCurrency(detailsModalOrder.total)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(pixModal)} onClose={() => setPixModal(null)} title="Pague com Pix">
        {pixModal && (
          <PixPaymentPanel
            orderId={pixModal.orderId}
            pix={pixModal.pix}
            onApproved={handlePixApproved}
            onClose={() => {
              setPixModal(null)
              void refreshOrders()
            }}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(cardModalOrder)}
        onClose={() => {
          if (!cardPaying) setCardModalOrder(null)
        }}
        title="Cartao / Boleto"
        size="lg"
      >
        {cardModalOrder && (
          <div>
            <p className="mb-1 text-sm text-muted">
              Pedido #{cardModalOrder.id.slice(0, 8)} — {formatCurrency(cardModalOrder.total)}
            </p>
            <p className="mb-4 text-sm text-muted">
              Pague no site com cartao ou boleto. Sem redirecionar para outra pagina.
            </p>
            {cardPaying && (
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                <LoaderCircle size={16} className="animate-spin" />
                Processando pagamento...
              </p>
            )}
            <MercadoPagoCardBrick
              amount={Number(cardModalOrder.total)}
              payerEmail={user?.email}
              disabled={cardPaying}
              onError={(message) => notify(message, 'error')}
              onSubmit={handleCardBrickSubmit}
            />
          </div>
        )}
      </Modal>

      <Modal open={Boolean(boletoUrl)} onClose={() => setBoletoUrl(null)} title="Boleto gerado">
        <div className="text-center">
          <p className="text-sm text-muted">
            O pedido sera confirmado em 1 a 2 dias uteis apos o pagamento do boleto.
          </p>
          {boletoUrl && (
            <a href={boletoUrl} target="_blank" rel="noreferrer" className="mt-5 block">
              <Button className="w-full">Abrir boleto</Button>
            </a>
          )}
          <Button
            variant="secondary"
            className="mt-3 w-full rounded-2xl"
            onClick={() => {
              setBoletoUrl(null)
              void refreshOrders()
            }}
          >
            Fechar
          </Button>
        </div>
      </Modal>

    </>
  )
}
