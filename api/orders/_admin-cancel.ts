import type { VercelRequest, VercelResponse } from '@vercel/node'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { requireAdminUser } from '../_lib/auth'
import { sendOrderCancelledEmail } from '../_lib/orderEmails'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin'

interface CancelRequest {
  orderId?: string
}

const cancellableStatuses = ['pendente', 'aprovado', 'preparando']

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  try {
    await requireAdminUser(request)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNAUTHORIZED'
    return response.status(message === 'FORBIDDEN' ? 403 : 401).json({ message: 'Nao autorizado' })
  }

  const { orderId } = request.body as CancelRequest
  if (!orderId) return response.status(400).json({ message: 'orderId is required' })

  const supabaseAdmin = getSupabaseAdmin()
  const { data: order, error } = await supabaseAdmin
    .from('pedidos')
    .select('id, status, mp_payment_id')
    .eq('id', orderId)
    .maybeSingle()

  if (error) {
    return response.status(500).json({ message: 'Erro ao buscar pedido', detail: error.message })
  }
  if (!order) return response.status(404).json({ message: 'Pedido nao encontrado' })
  if (!cancellableStatuses.includes(order.status)) {
    return response.status(400).json({
      message:
        order.status === 'enviado' || order.status === 'entregue'
          ? 'Pedidos enviados ou entregues nao podem ser cancelados pelo painel'
          : 'Este pedido nao pode mais ser cancelado',
    })
  }

  const accessToken = process.env.MP_ACCESS_TOKEN
  let paymentAction: 'none' | 'cancelled' | 'refunded' = 'none'

  try {
    if ((order.status === 'aprovado' || order.status === 'preparando') && !order.mp_payment_id) {
      return response.status(400).json({
        message: 'Pedido aprovado sem identificador de pagamento. Faca o estorno manual no Mercado Pago.',
      })
    }

    if (order.mp_payment_id) {
      if (!accessToken) {
        return response.status(500).json({ message: 'Mercado Pago token missing' })
      }

      const paymentClient = new Payment(new MercadoPagoConfig({ accessToken }))
      const payment = await paymentClient.get({ id: String(order.mp_payment_id) })

      if (payment.status === 'approved') {
        const refundResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(order.mp_payment_id))}/refunds`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'X-Idempotency-Key': `order-${order.id}-full-refund`,
            },
            body: JSON.stringify({}),
          },
        )
        const refund = (await refundResponse.json().catch(() => null)) as { message?: string } | null
        if (!refundResponse.ok) {
          return response.status(502).json({
            message: refund?.message ?? 'O Mercado Pago recusou o estorno',
          })
        }
        paymentAction = 'refunded'
      } else if (payment.status === 'refunded') {
        paymentAction = 'refunded'
      } else if (payment.status === 'pending' || payment.status === 'in_process') {
        await paymentClient.cancel({ id: String(order.mp_payment_id) })
        paymentAction = 'cancelled'
      } else if (payment.status !== 'cancelled' && payment.status !== 'rejected') {
        return response.status(400).json({
          message: `Pagamento com status "${payment.status ?? 'desconhecido'}" nao pode ser cancelado automaticamente`,
        })
      }
    }

    const stockWasDecremented = order.status === 'aprovado' || order.status === 'preparando'
    const { data: cancelled, error: updateError } = await supabaseAdmin.rpc('admin_cancel_order', {
      p_order_id: order.id,
      p_expected_status: order.status,
      p_restore_stock: stockWasDecremented,
    })

    if (updateError) {
      if (String(updateError.message).includes('admin_cancel_order')) {
        return response.status(500).json({
          message: 'Execute a migration migration_admin_cancel_order.sql no Supabase',
        })
      }
      throw updateError
    }
    if (!cancelled) {
      return response.status(409).json({ message: 'Pedido ja foi atualizado. Atualize a lista.' })
    }

    const email = await sendOrderCancelledEmail(order.id)
    if (!email.ok) console.error('[admin-cancel-order] E-mail:', email.message)

    return response.status(200).json({
      orderId: order.id,
      orderStatus: 'cancelado',
      paymentAction,
    })
  } catch (cancelError) {
    const message = cancelError instanceof Error ? cancelError.message : 'Erro ao cancelar pedido'
    return response.status(502).json({ message })
  }
}
