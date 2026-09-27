import { PIX_DISCOUNT_PERCENT } from '../lib/constants'
import { authHeaders } from '../lib/authToken'
import { supabase } from '../lib/supabase'
import type { CartItem, Coupon, Order, ShippingOption } from '../types'

const roundMoney = (value: number) => Math.round(value * 100) / 100

export function calculatePixDiscount(subtotal: number, couponDiscount: number, percent = PIX_DISCOUNT_PERCENT) {
  if (percent <= 0) return 0
  const base = Math.max(subtotal - couponDiscount, 0)
  return roundMoney(base * (percent / 100))
}

export function calculateOrderTotal(input: {
  subtotal: number
  couponDiscount: number
  pixDiscount: number
  shipping: number
}) {
  return roundMoney(Math.max(input.subtotal - input.couponDiscount - input.pixDiscount + input.shipping, 0))
}

export async function validateCouponForOrder(code: string, subtotal: number): Promise<Coupon> {
  const { data, error } = await supabase.rpc('get_valid_coupon', { p_codigo: code })

  if (error || !data) throw new Error('Cupom invalido ou expirado')
  if (subtotal < Number(data.valor_minimo)) throw new Error('Valor minimo do cupom nao atingido')

  return data as Coupon
}

export function calculateDiscount(coupon: Coupon, subtotal: number) {
  const discount =
    coupon.tipo === 'percentual' ? subtotal * (coupon.valor / 100) : Number(coupon.valor)
  return roundMoney(Math.min(discount, subtotal))
}

export async function createOrder(input: {
  items: CartItem[]
  paymentMethod: 'pix' | 'cartao'
  shippingOption: ShippingOption
  total: number
  couponCode?: string
  addressId: string
  /** CPF do destinatario (somente digitos ou mascarado). */
  cpf?: string
}) {
  const headers = await authHeaders()
  const requestPayload = {
    addressId: input.addressId,
    paymentMethod: input.paymentMethod,
    couponCode: input.couponCode,
    shippingServiceId: input.shippingOption.id,
    quotedShipping: input.shippingOption.price,
    expectedTotal: input.total,
    cpf: input.cpf,
    items: input.items.map((item) => ({
      productId: item.product.id,
      flavorId: item.flavor?.id ?? null,
      quantity: item.quantity,
    })),
  }

  const response = await fetch('/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(requestPayload),
  })

  const result = (await response.json().catch(() => null)) as
    | { order?: Order; message?: string; requestId?: string }
    | null
  if (!response.ok || !result?.order) {
    console.error('[checkout] erro ao criar pedido', {
      status: response.status,
      requestId: result?.requestId,
    })
    throw new Error(result?.message ?? 'Erro ao criar pedido')
  }
  return result.order
}

export async function getMyOrders(userId: string) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, itens_pedido(*, produtos(nome, slug, imagens_produtos(*))), enderecos(*)')
    .eq('usuario_id', userId)
    .order('criado_em', { ascending: false })
  if (error) throw error
  return (data ?? []) as Order[]
}

export async function getCoupon(code: string) {
  const { data, error } = await supabase.rpc('get_valid_coupon', { p_codigo: code })
  if (error) throw error
  if (!data) throw new Error('Cupom invalido ou expirado')
  return data as Coupon
}

export async function getAllOrders() {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, itens_pedido(*, produtos(nome)), enderecos(*), usuarios(nome, email)')
    .order('criado_em', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateOrderStatus(orderId: string, status: Order['status']) {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('pedidos')
    .update({
      status,
      atualizado_em: now,
      ...(status === 'entregue' ? { entregue_em: now } : {}),
    })
    .eq('id', orderId)
    .select()
    .single()
  if (error) throw error
  return data as Order
}

/** Admin cancela o pedido e estorna pagamentos aprovados no Mercado Pago. */
export async function adminCancelOrder(orderId: string) {
  const headers = await authHeaders()
  const response = await fetch('/api/orders/admin-cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ orderId }),
  })

  const result = (await response.json().catch(() => null)) as {
    message?: string
    orderId?: string
    orderStatus?: string
    paymentAction?: 'none' | 'cancelled' | 'refunded'
  } | null

  if (!response.ok) {
    throw new Error(result?.message ?? 'Erro ao cancelar pedido')
  }

  return result
}

/** Cliente cancela pedido pendente (API com service role — RLS nao permite update do dono). */
export async function cancelMyOrder(orderId: string) {
  const headers = await authHeaders()
  const response = await fetch('/api/orders/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ orderId }),
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(error?.message ?? 'Erro ao cancelar pedido')
  }

  return (await response.json()) as { orderId: string; orderStatus: string }
}
