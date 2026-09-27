import { supabase } from '../lib/supabase'
import type { CartItem, ShippingOption } from '../types'
import { getSiteSettings } from './settings'

const roundMoney = (value: number) => Math.round(value * 100) / 100

const currentPrice = (product: CartItem['product']) => product.preco_promocional ?? product.preco

const hasShippingDimensions = (item: CartItem) =>
  [item.product.peso_kg, item.product.altura_cm, item.product.largura_cm, item.product.comprimento_cm].every(
    (value) => Number.isFinite(Number(value)) && Number(value) > 0,
  )

async function enrichCartItems(items: CartItem[]) {
  if (items.every(hasShippingDimensions)) return items

  const ids = items.map((item) => item.product.id)
  const { data, error } = await supabase
    .from('produtos')
    .select('id, nome, peso_kg, altura_cm, largura_cm, comprimento_cm')
    .in('id', ids)

  if (error) throw new Error('Nao foi possivel carregar medidas dos produtos')

  const byId = new Map((data ?? []).map((product) => [product.id, product]))

  return items.map((item) => {
    const fresh = byId.get(item.product.id)
    if (!fresh) return item

    return {
      ...item,
      product: {
        ...item.product,
        nome: fresh.nome,
        peso_kg: fresh.peso_kg,
        altura_cm: fresh.altura_cm,
        largura_cm: fresh.largura_cm,
        comprimento_cm: fresh.comprimento_cm,
      },
    }
  })
}

export async function calculateShipping(cep: string, items: CartItem[]) {
  const enrichedItems = await enrichCartItems(items)

  const response = await fetch('/api/shipping/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cep,
      items: enrichedItems.map((item) => ({
        id: item.product.id,
        nome: item.product.nome,
        quantity: item.quantity,
        peso_kg: item.product.peso_kg,
        altura_cm: item.product.altura_cm,
        largura_cm: item.product.largura_cm,
        comprimento_cm: item.product.comprimento_cm,
      })),
    }),
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(error?.message ?? `Erro ao calcular frete (${response.status})`)
  }

  const data = (await response.json()) as { options: ShippingOption[] }
  const settings = await getSiteSettings()
  const subtotal = enrichedItems.reduce(
    (sum, item) => sum + currentPrice(item.product) * item.quantity,
    0,
  )

  if (
    settings.free_shipping_enabled &&
    roundMoney(subtotal) >= settings.free_shipping_threshold
  ) {
    return data.options.map((option) => ({
      ...option,
      price: 0,
      service: `${option.service} · ${settings.free_shipping_label}`,
    }))
  }

  return data.options
}
