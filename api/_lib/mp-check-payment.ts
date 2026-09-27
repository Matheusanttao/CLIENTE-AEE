import type { VercelRequest, VercelResponse } from '@vercel/node'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { requireAuthUser } from '../_lib/auth'
import { sendPaymentApprovedEmail } from '../_lib/orderEmails'
import { createSuperFreteCartForOrder } from '../_lib/superfrete'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin'

const statusMap: Record<string, string> = {
  approved: 'aprovado',
  rejected: 'recusado',
  cancelled: 'cancelado',
  refunded: 'cancelado',
  charged_back: 'cancelado',
  in_process: 'pendente',
  pending: 'pendente',
}

interface CheckRequest {
  orderId?: string
}

interface OrderItemRow {
  produto_id: string
  quantidade: number
  sabor_id: string | null
}

async function decrementStock(orderId: string) {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: items, error } = await supabaseAdmin
    .from('itens_pedido')
    .select('produto_id, quantidade, sabor_id')
    .eq('pedido_id', orderId)

  if (error || !items?.length) return

  for (const item of items as OrderItemRow[]) {
    if (item.sabor_id) {
      await supabaseAdmin.rpc('decrement_flavor_stock', {
        p_flavor_id: item.sabor_id,
        p_qty: item.quantidade,
      })
    } else {
      await supabaseAdmin.rpc('decrement_product_stock', {
        p_product_id: item.produto_id,
        p_qty: item.quantidade,
      })
    }
  }
}

/**
 * Consulta o Mercado Pago e sincroniza o status do pedido.
 * Necessario quando o webhook nao chega (dev local) ou atrasa.
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) return response.status(500).json({ message: 'Mercado Pago token missing' })

  const { orderId } = request.body as CheckRequest
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
    .select('id, usuario_id, status, total, mp_payment_id')
    .eq('id', orderId)
    .maybeSingle()

  if (error) return response.status(500).json({ message: 'Erro ao buscar pedido', detail: error.message })
  if (!order) return response.status(404).json({ message: 'Pedido nao encontrado' })
  if (order.usuario_id !== authUser.id) {
    return response.status(403).json({ message: 'Pedido nao pertence ao usuario' })
  }

  if (order.status === 'aprovado') {
    const email = await sendPaymentApprovedEmail(order.id)
    if (!email.ok) console.error('[check-payment] E-mail:', email.message)
    const shipping = await createSuperFreteCartForOrder(order.id)
    return response.status(200).json({
      orderStatus: 'aprovado',
      paymentStatus: 'approved',
      synced: false,
      superfrete: shipping,
    })
  }

  if (!order.mp_payment_id) {
    return response.status(200).json({
      orderStatus: order.status,
      paymentStatus: null,
      synced: false,
      message: 'Pagamento ainda nao gerado',
    })
  }

  try {
    const client = new MercadoPagoConfig({ accessToken })
    const payment = await new Payment(client).get({ id: String(order.mp_payment_id) })
    const paymentStatus = payment.status ?? 'pending'
    let newStatus = statusMap[paymentStatus] ?? 'pendente'

    if (newStatus === 'aprovado') {
      const paidAmount = Number(payment.transaction_amount)
      const expectedTotal = Number(order.total)
      const amountMatches = Number.isFinite(paidAmount) && Math.abs(paidAmount - expectedTotal) <= 0.01
      if (!amountMatches) {
        newStatus = 'pendente'
      }
    }

    let synced = false
    if (newStatus !== order.status) {
      await supabaseAdmin
        .from('pedidos')
        .update({
          status: newStatus,
          mp_payment_id: String(payment.id),
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', order.id)

      if (newStatus === 'aprovado' && order.status !== 'aprovado') {
        await decrementStock(order.id)
      }
      synced = true
    }

    let superfrete: { ok: boolean; cartId?: string; message?: string } | undefined
    if (newStatus === 'aprovado') {
      const email = await sendPaymentApprovedEmail(order.id)
      if (!email.ok) console.error('[check-payment] E-mail:', email.message)
      superfrete = await createSuperFreteCartForOrder(order.id)
      if (!superfrete.ok) console.error('[check-payment] SuperFrete:', superfrete.message)
    }

    return response.status(200).json({
      orderStatus: newStatus,
      paymentStatus,
      synced,
      paymentId: payment.id,
      superfrete,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao consultar pagamento'
    return response.status(502).json({ message })
  }
}
