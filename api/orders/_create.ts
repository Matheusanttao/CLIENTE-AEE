import crypto from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuthUser } from '../_lib/auth'
import { sendNewOrderAdminEmail, sendOrderReceivedEmail } from '../_lib/orderEmails'
import { getClientIp, rateLimit } from '../_lib/rateLimit'
import { quoteShipping, type ShippingQuoteItem } from '../_lib/shippingQuote'
import { isStoreDemoMode, STORE_DEMO_MESSAGE } from '../_lib/storeMode'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin'

interface CreateOrderRequest {
  addressId?: string
  paymentMethod?: 'pix' | 'cartao'
  couponCode?: string
  shippingServiceId?: string
  quotedShipping?: number
  expectedTotal?: number
  cpf?: string
  items?: Array<{
    productId?: string
    flavorId?: string | null
    quantity?: number
  }>
}

interface ProductRow {
  id: string
  nome: string
  ativo: boolean
  preco: number
  preco_promocional: number | null
  peso_kg: number
  altura_cm: number
  largura_cm: number
  comprimento_cm: number
}

const onlyDigits = (value: string) => value.replace(/\D/g, '')
const roundMoney = (value: number) => Math.round(value * 100) / 100

const isValidCpf = (value: string) => {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const digit = (length: number) => {
    let sum = 0
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index)
    }
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10])
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (isStoreDemoMode()) {
    return response.status(503).json({ message: STORE_DEMO_MESSAGE })
  }
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }
  if (!rateLimit(`create-order:${getClientIp(request)}`, 10, 60_000)) {
    return response.status(429).json({ message: 'Muitas tentativas. Aguarde alguns instantes.' })
  }

  let authUser
  try {
    authUser = await requireAuthUser(request)
  } catch {
    return response.status(401).json({ message: 'Nao autorizado' })
  }

  if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) {
    return response.status(400).json({ message: 'Dados do pedido invalidos' })
  }

  const {
    addressId,
    paymentMethod,
    couponCode,
    shippingServiceId,
    quotedShipping,
    expectedTotal,
    cpf,
    items = [],
  } = request.body as CreateOrderRequest
  const requestId = crypto.randomUUID()

  if (
    !addressId ||
    !paymentMethod ||
    !shippingServiceId ||
    !Number.isFinite(Number(quotedShipping)) ||
    Number(quotedShipping) < 0 ||
    !Number.isFinite(Number(expectedTotal)) ||
    Number(expectedTotal) < 0 ||
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > 50
  ) {
    return response.status(400).json({ message: 'Dados do pedido incompletos' })
  }

  const grouped = new Map<string, { productId: string; flavorId: string | null; quantity: number }>()
  for (const item of items) {
    const quantity = Number(item.quantity)
    if (!item.productId || !Number.isInteger(quantity) || quantity <= 0 || quantity > 1000) {
      return response.status(400).json({ message: 'Item ou quantidade invalida' })
    }
    const flavorId = item.flavorId || null
    const key = `${item.productId}:${flavorId ?? ''}`
    const current = grouped.get(key)
    const combinedQuantity = (current?.quantity ?? 0) + quantity
    if (combinedQuantity > 1000) {
      return response.status(400).json({ message: 'Quantidade maxima excedida' })
    }
    grouped.set(key, { productId: item.productId, flavorId, quantity: combinedQuantity })
  }
  const normalizedItems = [...grouped.values()]
  if (normalizedItems.reduce((total, item) => total + item.quantity, 0) > 1000) {
    return response.status(400).json({ message: 'Quantidade total maxima excedida' })
  }

  console.info('[create-order] requisicao recebida', {
    requestId,
    userId: authUser.id,
    itemCount: normalizedItems.length,
    paymentMethod,
  })

  const productIds = [...new Set(normalizedItems.map((item) => item.productId))]
  const supabase = getSupabaseAdmin()

  const [{ data: address, error: addressError }, { data: products, error: productsError }] =
    await Promise.all([
      supabase
        .from('enderecos')
        .select('id, usuario_id, cep')
        .eq('id', addressId)
        .eq('usuario_id', authUser.id)
        .maybeSingle(),
      supabase
        .from('produtos')
        .select('id, nome, ativo, preco, preco_promocional, peso_kg, altura_cm, largura_cm, comprimento_cm')
        .in('id', productIds),
    ])

  if (addressError || !address) {
    return response.status(400).json({ message: 'Endereco invalido' })
  }
  if (productsError || products?.length !== productIds.length) {
    return response.status(400).json({ message: 'Um ou mais produtos nao existem' })
  }

  const byId = new Map((products as ProductRow[]).map((product) => [product.id, product]))
  const unavailableProduct = normalizedItems.find((item) => !byId.get(item.productId)?.ativo)
  if (unavailableProduct) {
    return response.status(400).json({ message: 'Produto indisponivel' })
  }
  const quoteItems: ShippingQuoteItem[] = normalizedItems.map((item) => {
    const product = byId.get(item.productId) as ProductRow
    return {
      id: product.id,
      nome: product.nome,
      quantity: item.quantity,
      peso_kg: Number(product.peso_kg),
      altura_cm: Number(product.altura_cm),
      largura_cm: Number(product.largura_cm),
      comprimento_cm: Number(product.comprimento_cm),
    }
  })

  let selectedShipping
  try {
    const quotes = await quoteShipping(address.cep, quoteItems)
    selectedShipping = quotes.find((quote) => quote.id === shippingServiceId)
    if (!selectedShipping) {
      console.warn('[create-order] frete selecionado nao encontrado', {
        requestId,
        shippingServiceId,
        availableServiceIds: quotes.map((quote) => quote.id),
      })
      return response.status(400).json({ message: 'Opcao de frete desatualizada. Calcule novamente.' })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nao foi possivel validar o frete'
    console.error('[create-order] falha ao validar frete', { requestId, message })
    return response.status(502).json({ message })
  }

  const { data: settingsRow, error: settingsError } = await supabase
    .from('site_settings')
    .select('config')
    .eq('id', 1)
    .maybeSingle()

  if (settingsError) {
    console.error('[create-order] falha ao carregar configuracao da loja', {
      requestId,
      message: settingsError.message,
    })
    return response.status(500).json({ message: 'Nao foi possivel validar as configuracoes da loja' })
  }

  const config = (settingsRow?.config ?? {}) as Record<string, unknown>
  const configuredThreshold = Number(config.free_shipping_threshold ?? 199)
  const freeShippingThreshold = Number.isFinite(configuredThreshold) ? configuredThreshold : 199
  const freeShippingEnabled = config.free_shipping_enabled !== false
  const pixDiscountEnabled = config.pix_discount_enabled !== false
  const configuredPixPercent = Number(config.pix_discount_percent ?? 10)
  const pixPercent = Number.isFinite(configuredPixPercent)
    ? Math.min(Math.max(configuredPixPercent, 0), 100)
    : 10

  const serverSubtotal = roundMoney(
    normalizedItems.reduce((total, item) => {
      const product = byId.get(item.productId) as ProductRow
      return total + roundMoney(Number(product.preco_promocional ?? product.preco) * item.quantity)
    }, 0),
  )

  // Reaplica o cupom com os mesmos criterios do banco (create_order_secure) para
  // manter o total do servidor identico ao validado no Postgres.
  const normalizedCoupon = couponCode?.trim().toUpperCase() || null
  let serverDiscount = 0
  if (normalizedCoupon) {
    const { data: coupon, error: couponError } = await supabase
      .from('cupons')
      .select('tipo, valor, valor_minimo, ativo, expira_em')
      .eq('codigo', normalizedCoupon)
      .eq('ativo', true)
      .maybeSingle()

    if (couponError) {
      console.error('[create-order] falha ao validar cupom', { requestId, message: couponError.message })
      return response.status(500).json({ message: 'Nao foi possivel validar o cupom' })
    }

    const couponExpired = coupon?.expira_em ? new Date(coupon.expira_em).getTime() <= Date.now() : false
    const meetsMinimum = coupon ? serverSubtotal >= Number(coupon.valor_minimo) : false
    if (!coupon || couponExpired || !meetsMinimum) {
      return response.status(400).json({ message: 'Cupom invalido ou expirado' })
    }

    serverDiscount =
      coupon.tipo === 'percentual'
        ? roundMoney(serverSubtotal * (Number(coupon.valor) / 100))
        : Math.min(Number(coupon.valor), serverSubtotal)
  }

  const hasFreeShipping = freeShippingEnabled && serverSubtotal >= freeShippingThreshold
  const effectiveShipping = hasFreeShipping ? 0 : selectedShipping.price
  const pixDiscount =
    paymentMethod === 'pix' && pixDiscountEnabled
      ? roundMoney((serverSubtotal - serverDiscount) * (pixPercent / 100))
      : 0
  const authoritativeTotal = roundMoney(
    Math.max(serverSubtotal - serverDiscount - pixDiscount + effectiveShipping, 0),
  )

  // O total e sempre recalculado no servidor (precos, cupom e config do banco),
  // entao nunca confiamos no valor do cliente. So rejeitamos se o preco subiu
  // em relacao ao que o cliente viu, protegendo o usuario de cobranca maior.
  if (authoritativeTotal - Number(expectedTotal) > 0.01) {
    console.warn('[create-order] total do servidor maior que o esperado pelo cliente', {
      requestId,
      clientExpectedTotal: Number(expectedTotal),
      authoritativeTotal,
      subtotal: serverSubtotal,
      discount: serverDiscount,
      pixDiscount,
      effectiveShipping,
    })
    return response.status(409).json({
      message: 'Total atualizado. Revise o carrinho e tente novamente',
      requestId,
    })
  }

  const cpfDigits = onlyDigits(cpf ?? '')
  if (cpfDigits && !isValidCpf(cpfDigits)) {
    return response.status(400).json({ message: 'CPF invalido' })
  }

  console.info('[create-order] valores calculados', {
    requestId,
    authoritativeTotal,
    hasCoupon: Boolean(normalizedCoupon),
    paymentMethod,
  })

  const { data: order, error } = await supabase.rpc('create_order_secure', {
    p_user_id: authUser.id,
    p_address_id: address.id,
    p_items: normalizedItems.map((item) => ({
      produto_id: item.productId,
      sabor_id: item.flavorId,
      quantidade: item.quantity,
    })),
    p_payment_method: paymentMethod,
    p_coupon_code: couponCode?.trim() || null,
    p_shipping: effectiveShipping,
    p_shipping_service: selectedShipping.service,
    p_shipping_carrier: selectedShipping.carrier,
    p_shipping_days: selectedShipping.deliveryTime,
    p_shipping_cep: selectedShipping.cep,
    p_shipping_service_id: selectedShipping.id,
    p_expected_total: authoritativeTotal,
    p_cpf: cpfDigits || null,
  })

  if (error || !order) {
    const message = error?.message ?? 'Nao foi possivel criar o pedido'
    console.error('[create-order] banco rejeitou o pedido', {
      requestId,
      message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      clientExpectedTotal: Number(expectedTotal),
      authoritativeTotal,
      subtotal: serverSubtotal,
      discount: serverDiscount,
      pixDiscount,
      checkoutShipping: Number(quotedShipping),
      quotedShipping: selectedShipping.price,
      effectiveShipping,
      freeShippingThreshold,
      hasFreeShipping,
    })
    const expectedError = /invalido|indisponivel|estoque|cupom|carrinho/i.test(message)
    return response.status(expectedError ? 400 : 500).json({ message, requestId })
  }

  console.info('[create-order] pedido criado', { requestId, orderId: order.id })

  void sendOrderReceivedEmail(order.id).then((email) => {
    if (!email.ok) console.error('[create-order] E-mail cliente:', email.message)
  })
  void sendNewOrderAdminEmail(order.id).then((email) => {
    if (!email.ok) console.error('[create-order] E-mail admin:', email.message)
  })

  return response.status(201).json({ order })
}
