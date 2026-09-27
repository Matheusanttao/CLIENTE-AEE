import type { VercelRequest, VercelResponse } from '@vercel/node'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { requireAuthUser } from '../_lib/auth'
import { isStoreDemoMode, STORE_DEMO_MESSAGE } from '../_lib/storeMode'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin'

interface PreferenceRequest {
  orderId?: string
}

interface OrderItem {
  quantidade: number
  preco_unitario: number
  produtos: {
    nome: string
  }
}

const roundMoney = (value: number) => Math.round(value * 100) / 100

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Erro ao criar preferencia no Mercado Pago'
}

const isLocalAppUrl = (url: string) => /localhost|127\.0\.0\.1/i.test(url)

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (isStoreDemoMode()) {
    return response.status(503).json({ message: STORE_DEMO_MESSAGE })
  }
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  const accessToken = process.env.MP_ACCESS_TOKEN
  const requestOrigin = request.headers.origin ?? request.headers.referer?.replace(/\/[^/]*$/, '')
  const appUrl = process.env.APP_URL ?? requestOrigin ?? 'http://localhost:5174'
  const { orderId } = request.body as PreferenceRequest

  if (!accessToken) return response.status(500).json({ message: 'Mercado Pago token missing' })
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
    .single()

  if (error || !order) return response.status(404).json({ message: 'Pedido nao encontrado' })
  if (order.usuario_id !== authUser.id) return response.status(403).json({ message: 'Pedido nao pertence ao usuario' })
  if (order.status !== 'pendente') {
    return response.status(400).json({ message: 'Pedido ja processado' })
  }

  const orderItems = (order.itens_pedido ?? []) as OrderItem[]
  if (orderItems.length === 0) return response.status(400).json({ message: 'Pedido sem itens' })

  const subtotal = Number(order.subtotal)
  const discount = Number(order.desconto) + Number(order.desconto_pix ?? 0)
  const shipping = Number(order.frete)
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
      title: order.frete_servico ? `Frete - ${order.frete_servico}` : 'Frete',
      quantity: 1,
      unit_price: roundMoney(shipping),
      currency_id: 'BRL',
    })
  }

  if (items.length === 0) return response.status(400).json({ message: 'Pedido sem valor para pagamento' })

  const backUrls = {
    success: `${appUrl}/checkout/sucesso`,
    failure: `${appUrl}/checkout/falha`,
    pending: `${appUrl}/checkout/pendente`,
  }

  const localDev = isLocalAppUrl(appUrl)

  try {
    const client = new MercadoPagoConfig({ accessToken })
    const preference = new Preference(client)
    const result = await preference.create({
      body: {
        external_reference: order.id,
        items,
        back_urls: backUrls,
        ...(localDev
          ? {}
          : {
              notification_url: `${appUrl}/api/mp/webhook`,
              auto_return: 'approved',
            }),
      },
    })

    await supabaseAdmin.from('pedidos').update({ mp_preference_id: result.id }).eq('id', order.id)

    return response.status(200).json({
      initPoint: result.init_point ?? result.sandbox_init_point,
      preferenceId: result.id,
    })
  } catch (error) {
    return response.status(502).json({ message: getErrorMessage(error) })
  }
}
