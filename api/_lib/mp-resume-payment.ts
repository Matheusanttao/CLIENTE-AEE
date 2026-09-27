import crypto from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'
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

interface ResumeRequest {
  orderId?: string
  /** Forca Pix ou checkout MP; por padrao usa metodo_pagamento do pedido. */
  method?: 'pix' | 'cartao'
}

interface OrderItem {
  quantidade: number
  preco_unitario: number
  produtos: { nome: string } | null
}

interface OrderItemRow {
  produto_id: string
  quantidade: number
  sabor_id: string | null
}

const roundMoney = (value: number) => Math.round(value * 100) / 100

const isLocalAppUrl = (url: string) => /localhost|127\.0\.0\.1/i.test(url)

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Erro ao retomar pagamento'
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

function extractPix(result: {
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string | null
      qr_code_base64?: string | null
      ticket_url?: string | null
    }
  }
}) {
  const transactionData = result.point_of_interaction?.transaction_data
  if (!transactionData?.qr_code) return null
  return {
    qrCode: transactionData.qr_code,
    qrCodeBase64: transactionData.qr_code_base64 ?? undefined,
    ticketUrl: transactionData.ticket_url ?? undefined,
  }
}

async function createPixPayment(input: {
  accessToken: string
  orderId: string
  total: number
  email: string
  appUrl: string
  freteServico: string | null
}) {
  const client = new MercadoPagoConfig({ accessToken: input.accessToken })
  const payment = new Payment(client)
  const result = await payment.create({
    body: {
      transaction_amount: roundMoney(input.total),
      payment_method_id: 'pix',
      external_reference: input.orderId,
      description: `Pedido - ${input.orderId}`,
      payer: { email: input.email },
      ...(isLocalAppUrl(input.appUrl) ? {} : { notification_url: `${input.appUrl}/api/mp/webhook` }),
    },
    requestOptions: { idempotencyKey: crypto.randomUUID() },
  })

  return result
}

async function createCheckoutPreference(input: {
  accessToken: string
  order: {
    id: string
    subtotal: number
    desconto: number
    desconto_pix?: number | null
    frete: number
    frete_servico: string | null
    itens_pedido?: OrderItem[] | null
  }
  appUrl: string
}) {
  const orderItems = (input.order.itens_pedido ?? []) as OrderItem[]
  if (orderItems.length === 0) throw new Error('Pedido sem itens')

  const subtotal = Number(input.order.subtotal)
  const discount = Number(input.order.desconto) + Number(input.order.desconto_pix ?? 0)
  const shipping = Number(input.order.frete)
  let remainingDiscount = discount

  const items = orderItems
    .map((item, index) => {
      const lineTotal = Number(item.preco_unitario) * item.quantidade
      const allocatedDiscount =
        subtotal <= 0 || index === orderItems.length - 1
          ? remainingDiscount
          : roundMoney(discount * (lineTotal / subtotal))
      remainingDiscount = roundMoney(remainingDiscount - allocatedDiscount)
      const unitPrice = roundMoney(Math.max(lineTotal - allocatedDiscount, 0))
      if (unitPrice <= 0) return null
      return {
        id: `produto-${index + 1}`,
        title: `${item.quantidade}x ${item.produtos?.nome ?? 'Produto'}`,
        quantity: 1,
        unit_price: unitPrice,
        currency_id: 'BRL',
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  if (shipping > 0) {
    items.push({
      id: 'frete',
      title: input.order.frete_servico ? `Frete - ${input.order.frete_servico}` : 'Frete',
      quantity: 1,
      unit_price: roundMoney(shipping),
      currency_id: 'BRL',
    })
  }

  if (items.length === 0) throw new Error('Pedido sem valor para pagamento')

  const backUrls = {
    success: `${input.appUrl}/checkout/sucesso`,
    failure: `${input.appUrl}/checkout/falha`,
    pending: `${input.appUrl}/checkout/pendente`,
  }
  const localDev = isLocalAppUrl(input.appUrl)

  const preference = new Preference(new MercadoPagoConfig({ accessToken: input.accessToken }))
  const result = await preference.create({
    body: {
      external_reference: input.order.id,
      items,
      back_urls: backUrls,
      ...(localDev
        ? {}
        : {
            notification_url: `${input.appUrl}/api/mp/webhook`,
            auto_return: 'approved',
          }),
    },
  })

  return result
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

  const { orderId, method } = request.body as ResumeRequest
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
    .select('*, itens_pedido(*, produtos(nome))')
    .eq('id', orderId)
    .maybeSingle()

  if (error) return response.status(500).json({ message: 'Erro ao buscar pedido', detail: error.message })
  if (!order) return response.status(404).json({ message: 'Pedido nao encontrado' })
  if (order.usuario_id !== authUser.id) {
    return response.status(403).json({ message: 'Pedido nao pertence ao usuario' })
  }
  if (order.status !== 'pendente') {
    return response.status(400).json({
      message: 'Pedido ja processado',
      orderStatus: order.status,
    })
  }

  const appUrl = process.env.APP_URL ?? request.headers.origin ?? 'http://localhost:5173'
  const payMethod: 'pix' | 'cartao' =
    method === 'pix' || method === 'cartao'
      ? method
      : order.metodo_pagamento === 'cartao'
        ? 'cartao'
        : 'pix'

  const client = new MercadoPagoConfig({ accessToken })

  try {
    // Reaproveita cobranca Pix existente enquanto ainda estiver pendente.
    if (order.mp_payment_id && payMethod === 'pix') {
      const existing = await new Payment(client).get({ id: String(order.mp_payment_id) })
      const mpStatus = existing.status ?? 'pending'
      const newStatus = statusMap[mpStatus] ?? 'pendente'

      if (newStatus !== order.status) {
        await supabaseAdmin
          .from('pedidos')
          .update({
            status: newStatus,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', order.id)

        if (newStatus === 'aprovado') {
          await decrementStock(order.id)
          void createSuperFreteCartForOrder(order.id).then((result) => {
            if (!result.ok) console.error('[resume-payment] SuperFrete:', result.message)
          })
        }
      }

      if (newStatus === 'aprovado') {
        const email = await sendPaymentApprovedEmail(order.id)
        if (!email.ok) console.error('[resume-payment] E-mail:', email.message)
        return response.status(200).json({
          status: mpStatus,
          orderStatus: newStatus,
          paymentId: existing.id,
          pix: null,
          boletoUrl: null,
          initPoint: null,
        })
      }

      if (newStatus === 'pendente') {
        const pix = extractPix(existing)
        if (pix) {
          return response.status(200).json({
            status: mpStatus,
            orderStatus: 'pendente',
            paymentId: existing.id,
            pix,
            boletoUrl: existing.transaction_details?.external_resource_url ?? null,
            initPoint: null,
          })
        }
      }
      // Pix expirado/cancelado: cai para gerar nova cobranca abaixo.
    }

    if (payMethod === 'pix') {
      const result = await createPixPayment({
        accessToken,
        orderId: order.id,
        total: Number(order.total),
        email: authUser.email ?? '',
        appUrl,
        freteServico: order.frete_servico,
      })

      const mpStatus = result.status ?? 'pending'
      const newStatus = statusMap[mpStatus] ?? 'pendente'

      await supabaseAdmin
        .from('pedidos')
        .update({
          status: newStatus,
          metodo_pagamento: 'pix',
          mp_payment_id: String(result.id),
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', order.id)

      if (newStatus === 'aprovado') {
        await decrementStock(order.id)
        const email = await sendPaymentApprovedEmail(order.id)
        if (!email.ok) console.error('[resume-payment] E-mail:', email.message)
        void createSuperFreteCartForOrder(order.id).then((result) => {
          if (!result.ok) console.error('[resume-payment] SuperFrete:', result.message)
        })
      }

      return response.status(200).json({
        status: mpStatus,
        orderStatus: newStatus,
        paymentId: result.id,
        pix: extractPix(result),
        boletoUrl: result.transaction_details?.external_resource_url ?? null,
        initPoint: null,
      })
    }

    const preference = await createCheckoutPreference({
      accessToken,
      order,
      appUrl,
    })

    await supabaseAdmin
      .from('pedidos')
      .update({
        metodo_pagamento: 'cartao',
        mp_preference_id: preference.id,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', order.id)

    return response.status(200).json({
      status: 'pending',
      orderStatus: 'pendente',
      paymentId: null,
      pix: null,
      boletoUrl: null,
      initPoint: preference.init_point ?? preference.sandbox_init_point ?? null,
    })
  } catch (error) {
    return response.status(502).json({ message: getErrorMessage(error) })
  }
}
