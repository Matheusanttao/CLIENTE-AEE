import { createHmac, timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sendTrackingCodeEmail } from '../_lib/orderEmails'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin'

type SuperFreteWebhook = {
  event?: string
  data?: {
    id?: string
    status?: string
    tracking?: string | null
    tracking_url?: string | null
    generated_at?: string | null
    posted_at?: string | null
    delivered_at?: string | null
    tags?: Array<{ tag?: string | null }>
  }
}

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function isAuthorized(request: VercelRequest, body: SuperFreteWebhook) {
  const webhookToken = process.env.SUPERFRETE_WEBHOOK_TOKEN
  const queryToken = typeof request.query.token === 'string' ? request.query.token : undefined
  if (webhookToken && queryToken && safeEqual(webhookToken, queryToken)) return true

  const secret = process.env.SUPERFRETE_WEBHOOK_SECRET
  const received = headerValue(request.headers['x-me-signature'])
  if (!secret || !received) return false

  const serializedBody =
    typeof request.body === 'string' ? request.body : JSON.stringify(body)
  const digest = createHmac('sha256', secret).update(serializedBody).digest()
  const candidates = [
    digest.toString('hex'),
    digest.toString('base64'),
    `sha256=${digest.toString('hex')}`,
  ]
  return candidates.some((candidate) => safeEqual(candidate, received))
}

function normalizeTrackingUrl(value: string | null | undefined) {
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value.replace(/^\/+/, '')}`
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  const payload = (request.body ?? {}) as SuperFreteWebhook
  if (!isAuthorized(request, payload)) {
    return response.status(401).json({ message: 'Assinatura SuperFrete invalida' })
  }

  const event = payload.event?.trim()
  const data = payload.data
  const superFreteId = data?.id?.trim()
  if (!event || !data || !superFreteId) {
    return response.status(400).json({ message: 'Evento SuperFrete invalido' })
  }

  const supabase = getSupabaseAdmin()
  let { data: order } = await supabase
    .from('pedidos')
    .select('id, status, superfrete_cart_id')
    .eq('superfrete_cart_id', superFreteId)
    .maybeSingle()

  if (!order) {
    const tag = data.tags?.map((entry) => entry.tag?.trim()).find(Boolean)
    if (tag && /^[0-9a-f-]{8,36}$/i.test(tag)) {
      const { data: recentOrders } = await supabase
        .from('pedidos')
        .select('id, status, superfrete_cart_id')
        .order('criado_em', { ascending: false })
        .limit(1000)
      order =
        recentOrders?.find((entry) =>
          String(entry.id).toLowerCase().startsWith(tag.toLowerCase()),
        ) ?? null
    }
  }

  if (!order) {
    console.warn('[superfrete-webhook] pedido nao localizado', { event, superFreteId })
    return response.status(200).json({ received: true, matched: false })
  }

  const blockedStatuses = ['pendente', 'recusado', 'cancelado']
  let nextStatus = order.status
  if (
    ['order.released', 'order.generated'].includes(event) &&
    ['aprovado', 'preparando'].includes(order.status)
  ) {
    nextStatus = 'preparando'
  } else if (event === 'order.posted' && !blockedStatuses.includes(order.status)) {
    nextStatus = order.status === 'entregue' ? 'entregue' : 'enviado'
  } else if (event === 'order.delivered' && !blockedStatuses.includes(order.status)) {
    nextStatus = 'entregue'
  }

  const now = new Date().toISOString()
  const updates: Record<string, string> = {
    status: nextStatus,
    superfrete_status: data.status ?? event.replace('order.', ''),
    atualizado_em: now,
  }
  if (!order.superfrete_cart_id) updates.superfrete_cart_id = superFreteId
  if (data.tracking) updates.codigo_rastreio = data.tracking
  const trackingUrl = normalizeTrackingUrl(data.tracking_url)
  if (trackingUrl) updates.url_rastreio = trackingUrl
  if (data.generated_at) updates.etiqueta_gerada_em = data.generated_at
  if (data.posted_at) updates.postado_em = data.posted_at
  if (data.delivered_at) {
    updates.entregue_em = data.delivered_at
  } else if (event === 'order.delivered') {
    updates.entregue_em = now
  }

  const { error } = await supabase.from('pedidos').update(updates).eq('id', order.id)
  if (error) {
    console.error('[superfrete-webhook] falha ao atualizar pedido', error.message)
    return response.status(500).json({ message: 'Erro ao atualizar rastreamento' })
  }

  if (data.tracking) {
    const email = await sendTrackingCodeEmail(order.id)
    if (!email.ok) console.error('[superfrete-webhook] E-mail:', email.message)
  }

  return response.status(200).json({ received: true, matched: true })
}
