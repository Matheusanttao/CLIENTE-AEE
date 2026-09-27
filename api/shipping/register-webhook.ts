import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdminUser } from '../_lib/auth'

const events = [
  'order.released',
  'order.generated',
  'order.posted',
  'order.delivered',
  'order.cancelled',
]

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  try {
    await requireAdminUser(request)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNAUTHORIZED'
    return response.status(message === 'FORBIDDEN' ? 403 : 401).json({ message })
  }

  const token = process.env.SUPERFRETE_TOKEN
  const webhookToken = process.env.SUPERFRETE_WEBHOOK_TOKEN
  const userAgent =
    process.env.SUPERFRETE_USER_AGENT ??
    'A&E Total Mix (contato@passarinsuplementos.com.br)'
  const environment = process.env.SUPERFRETE_ENV ?? 'production'
  const baseUrl =
    environment === 'production' ? 'https://api.superfrete.com' : 'https://sandbox.superfrete.com'
  const configuredUrl = process.env.APP_URL
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const appUrl = (configuredUrl ?? (vercelUrl ? `https://${vercelUrl}` : '')).replace(/\/+$/, '')

  if (!token || !webhookToken || !appUrl) {
    return response.status(500).json({
      message: 'Configure SUPERFRETE_TOKEN, SUPERFRETE_WEBHOOK_TOKEN e APP_URL',
    })
  }

  const webhookUrl = `${appUrl}/api/shipping/webhook?token=${encodeURIComponent(webhookToken)}`
  const headers = {
    Authorization: `Bearer ${token}`,
    'User-Agent': userAgent,
    accept: 'application/json',
  }

  const listResponse = await fetch(`${baseUrl}/api/v0/webhook`, { headers })
  if (listResponse.ok) {
    const listPayload = (await listResponse.json().catch(() => null)) as
      | Array<{ id?: string; url?: string; is_active?: boolean }>
      | { data?: Array<{ id?: string; url?: string; is_active?: boolean }> }
      | null
    const webhooks = Array.isArray(listPayload) ? listPayload : (listPayload?.data ?? [])
    const existing = webhooks.find((webhook) => webhook.url === webhookUrl && webhook.is_active !== false)
    if (existing) {
      return response.status(200).json({
        ok: true,
        id: existing.id,
        events,
        message: 'Webhook de rastreamento ja esta ativo',
      })
    }
  }

  const superFreteResponse = await fetch(`${baseUrl}/api/v0/webhook`, {
    method: 'POST',
    headers: {
      ...headers,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Rastreamento da loja',
      url: webhookUrl,
      events,
    }),
  })

  const payload = (await superFreteResponse.json().catch(() => null)) as {
    id?: string
    message?: string
  } | null
  if (!superFreteResponse.ok) {
    return response.status(502).json({
      message: payload?.message ?? `Falha ao cadastrar webhook (${superFreteResponse.status})`,
    })
  }

  return response.status(201).json({
    ok: true,
    id: payload?.id,
    events,
    message: 'Webhook de rastreamento cadastrado na SuperFrete',
  })
}
