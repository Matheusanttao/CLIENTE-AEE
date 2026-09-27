import type { VercelRequest, VercelResponse } from '@vercel/node'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { verifyMercadoPagoSignature } from '../_lib/mercadopagoWebhook'
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

interface OrderItemRow {
  produto_id: string
  quantidade: number
  sabor_id: string | null
}

async function adjustStockForOrder(orderId: string, direction: 'decrement' | 'restore') {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: items, error } = await supabaseAdmin
    .from('itens_pedido')
    .select('produto_id, quantidade, sabor_id')
    .eq('pedido_id', orderId)

  if (error || !items?.length) return

  for (const item of items as OrderItemRow[]) {
    if (item.sabor_id) {
      const rpc = direction === 'decrement' ? 'decrement_flavor_stock' : 'restore_flavor_stock'
      await supabaseAdmin.rpc(rpc, {
        p_flavor_id: item.sabor_id,
        p_qty: item.quantidade,
      })
    } else {
      const rpc = direction === 'decrement' ? 'decrement_product_stock' : 'restore_product_stock'
      await supabaseAdmin.rpc(rpc, {
        p_product_id: item.produto_id,
        p_qty: item.quantidade,
      })
    }
  }
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  if (!verifyMercadoPagoSignature(request)) {
    return response.status(401).json({ message: 'Assinatura invalida' })
  }

  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) return response.status(500).json({ message: 'Mercado Pago token missing' })

  const paymentId =
    request.query['data.id'] ??
    request.query.id ??
    (request.body as { data?: { id?: string }; id?: string }).data?.id ??
    (request.body as { id?: string }).id

  if (!paymentId) return response.status(200).json({ received: true })

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const client = new MercadoPagoConfig({ accessToken })
    const payment = await new Payment(client).get({ id: String(paymentId) })
    const orderId = payment.external_reference

    if (!orderId) return response.status(200).json({ received: true })

    const { data: existingOrder } = await supabaseAdmin
      .from('pedidos')
      .select('status, total')
      .eq('id', orderId)
      .single()

    if (!existingOrder) return response.status(200).json({ received: true })

    const oldStatus = existingOrder.status
    let newStatus = statusMap[payment.status ?? 'pending'] ?? 'pendente'

    // Confere o valor efetivamente pago contra o total registrado no pedido.
    // Evita que um pagamento de valor menor (ou adulterado) aprove o pedido.
    if (newStatus === 'aprovado') {
      const paidAmount = Number(payment.transaction_amount)
      const expectedTotal = Number(existingOrder.total)
      const amountMatches = Number.isFinite(paidAmount) && Math.abs(paidAmount - expectedTotal) <= 0.01

      if (!amountMatches) {
        console.error('[mp-webhook] valor divergente: pagamento nao aprovado automaticamente', {
          orderId,
          paid: paidAmount,
          expected: expectedTotal,
        })
        newStatus = 'pendente'
      }
    }

    // Um webhook tardio do pagamento nao deve fazer a entrega regredir.
    const statusToPersist =
      ['preparando', 'enviado', 'entregue'].includes(oldStatus) &&
      ['pendente', 'aprovado'].includes(newStatus)
        ? oldStatus
        : newStatus

    await supabaseAdmin
      .from('pedidos')
      .update({
        status: statusToPersist,
        mp_payment_id: String(payment.id),
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (newStatus === 'aprovado' && oldStatus !== 'aprovado') {
      await adjustStockForOrder(orderId, 'decrement')
      void createSuperFreteCartForOrder(orderId).then((result) => {
        if (!result.ok) console.error('[mp-webhook] SuperFrete:', result.message)
      })
    }

    if (newStatus === 'aprovado') {
      const email = await sendPaymentApprovedEmail(orderId)
      if (!email.ok) console.error('[mp-webhook] E-mail:', email.message)
    }

    if (['cancelado', 'recusado'].includes(newStatus) && oldStatus === 'aprovado') {
      await adjustStockForOrder(orderId, 'restore')
    }

    return response.status(200).json({ received: true })
  } catch {
    return response.status(500).json({ message: 'Erro ao processar webhook' })
  }
}
