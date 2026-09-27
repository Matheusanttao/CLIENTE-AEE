import crypto from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { requireAuthUser } from '../_lib/auth'
import { sendPaymentApprovedEmail } from '../_lib/orderEmails'
import { isStoreDemoMode, STORE_DEMO_MESSAGE } from '../_lib/storeMode'
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

interface ProcessPaymentRequest {
  orderId?: string
  // formData enviado pelo Payment Brick (token, payment_method_id, installments, payer, etc.)
  formData?: Record<string, unknown>
}

interface OrderItemRow {
  produto_id: string
  quantidade: number
  sabor_id: string | null
}

const isLocalAppUrl = (url: string) => /localhost|127\.0\.0\.1/i.test(url)

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

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (isStoreDemoMode()) {
    return response.status(503).json({ message: STORE_DEMO_MESSAGE })
  }
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) return response.status(500).json({ message: 'Mercado Pago token missing' })

  const { orderId, formData } = request.body as ProcessPaymentRequest
  if (!orderId) return response.status(400).json({ message: 'orderId is required' })
  if (!formData || typeof formData !== 'object') {
    return response.status(400).json({ message: 'Dados de pagamento ausentes' })
  }

  let authUser
  try {
    authUser = await requireAuthUser(request)
  } catch {
    return response.status(401).json({ message: 'Nao autorizado' })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: order, error } = await supabaseAdmin
    .from('pedidos')
    .select('id, usuario_id, status, total, frete_servico')
    .eq('id', orderId)
    .maybeSingle()

  if (error) {
    console.error('[process-payment] erro ao buscar pedido', {
      orderId,
      message: error.message,
      code: error.code,
      supabaseUrl: process.env.VITE_SUPABASE_URL,
    })
    return response.status(500).json({
      message: 'Erro ao buscar pedido no banco',
      detail: error.message,
    })
  }

  if (!order) {
    console.error('[process-payment] pedido nao encontrado', {
      orderId,
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    })
    return response.status(404).json({
      message: 'Pedido nao encontrado',
      detail:
        'Confira se SUPABASE_SERVICE_ROLE_KEY e VITE_SUPABASE_URL sao do MESMO projeto Supabase (o secret/service_role tem que bater com a URL).',
    })
  }
  if (order.usuario_id !== authUser.id) {
    return response.status(403).json({ message: 'Pedido nao pertence ao usuario' })
  }
  if (order.status !== 'pendente') {
    return response.status(400).json({ message: 'Pedido ja processado' })
  }

  const appUrl = process.env.APP_URL ?? request.headers.origin ?? 'http://localhost:5173'
  const expectedTotal = Math.round(Number(order.total) * 100) / 100

  // O valor da cobranca e SEMPRE definido pelo servidor (total do pedido),
  // nunca confiamos no transaction_amount vindo do cliente.
  const paymentBody = {
    ...formData,
    transaction_amount: expectedTotal,
    external_reference: order.id,
    description: `Pedido A&E Total Mix - ${order.id}`,
    ...(isLocalAppUrl(appUrl) ? {} : { notification_url: `${appUrl}/api/mp/webhook` }),
  }

  try {
    const client = new MercadoPagoConfig({ accessToken })
    const payment = new Payment(client)
    const result = await payment.create({
      body: paymentBody as Parameters<typeof payment.create>[0]['body'],
      requestOptions: { idempotencyKey: crypto.randomUUID() },
    })

    const mpStatus = result.status ?? 'pending'
    const newStatus = statusMap[mpStatus] ?? 'pendente'

    await supabaseAdmin
      .from('pedidos')
      .update({
        status: newStatus,
        mp_payment_id: String(result.id),
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (newStatus === 'aprovado') {
      await decrementStock(order.id)
      const email = await sendPaymentApprovedEmail(order.id)
      if (!email.ok) console.error('[process-payment] E-mail:', email.message)
      void createSuperFreteCartForOrder(order.id).then((result) => {
        if (!result.ok) console.error('[process-payment] SuperFrete:', result.message)
      })
    }

    const transactionData = result.point_of_interaction?.transaction_data

    return response.status(200).json({
      status: mpStatus,
      statusDetail: result.status_detail,
      orderStatus: newStatus,
      paymentId: result.id,
      // Pix
      pix: transactionData?.qr_code
        ? {
            qrCode: transactionData.qr_code,
            qrCodeBase64: transactionData.qr_code_base64,
            ticketUrl: transactionData.ticket_url,
          }
        : null,
      // Boleto
      boletoUrl: result.transaction_details?.external_resource_url ?? null,
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Erro ao processar pagamento'
    return response.status(502).json({ message })
  }
}
