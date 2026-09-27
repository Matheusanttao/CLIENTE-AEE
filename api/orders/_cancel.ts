import type { VercelRequest, VercelResponse } from '@vercel/node'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { requireAuthUser } from '../_lib/auth'
import { sendOrderCancelledEmail } from '../_lib/orderEmails'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin'

interface CancelRequest {
  orderId?: string
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  const { orderId } = request.body as CancelRequest
  if (!orderId) return response.status(400).json({ message: 'orderId is required' })

  let authUser
  try {
    authUser = await requireAuthUser(request)
  } catch {
    return response.status(401).json({ message: 'Nao autorizado' })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: order, error } = await supabaseAdmin
    .from('pedidos')
    .select('id, usuario_id, status, mp_payment_id')
    .eq('id', orderId)
    .maybeSingle()

  if (error) {
    return response.status(500).json({ message: 'Erro ao buscar pedido', detail: error.message })
  }
  if (!order) return response.status(404).json({ message: 'Pedido nao encontrado' })
  if (order.usuario_id !== authUser.id) {
    return response.status(403).json({ message: 'Pedido nao pertence ao usuario' })
  }
  if (order.status !== 'pendente') {
    return response.status(400).json({
      message: 'So e possivel cancelar pedidos com pagamento pendente',
      orderStatus: order.status,
    })
  }

  // Tenta cancelar cobranca no Mercado Pago (melhor esforco; nao bloqueia o cancelamento local).
  if (order.mp_payment_id && process.env.MP_ACCESS_TOKEN) {
    try {
      const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
      await new Payment(client).cancel({ id: String(order.mp_payment_id) })
    } catch (mpError) {
      console.warn('[cancel-order] falha ao cancelar pagamento MP', {
        orderId: order.id,
        paymentId: order.mp_payment_id,
        error: mpError instanceof Error ? mpError.message : mpError,
      })
    }
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('pedidos')
    .update({
      status: 'cancelado',
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', order.id)
    .eq('status', 'pendente')
    .select('id, status')
    .maybeSingle()

  if (updateError) {
    return response.status(500).json({ message: 'Erro ao cancelar pedido', detail: updateError.message })
  }
  if (!updated) {
    return response.status(409).json({ message: 'Pedido ja foi atualizado. Atualize a lista.' })
  }

  const email = await sendOrderCancelledEmail(updated.id)
  if (!email.ok) console.error('[cancel-order] E-mail:', email.message)

  return response.status(200).json({
    orderId: updated.id,
    orderStatus: updated.status,
  })
}
