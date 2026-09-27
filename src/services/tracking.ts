export interface TrackedOrder {
  id: string
  status: string
  total: number
  criado_em: string
  frete_servico: string | null
  frete_transportadora: string | null
  frete_prazo_dias: number | null
  codigo_rastreio: string | null
  url_rastreio: string | null
  etiqueta_gerada_em: string | null
  postado_em: string | null
  entregue_em: string | null
}

export async function trackOrder(orderId: string, email: string) {
  const response = await fetch('/api/orders/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, email }),
  })

  const payload = (await response.json()) as TrackedOrder & { message?: string }
  if (!response.ok) throw new Error(payload.message ?? 'Pedido nao encontrado')
  return payload as TrackedOrder
}
