import crypto from 'node:crypto'
import type { VercelRequest } from '@vercel/node'

export function verifyMercadoPagoSignature(request: VercelRequest): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) {
    console.error(
      '[mp-webhook] MP_WEBHOOK_SECRET ausente: webhook bloqueado por seguranca. ' +
        'Defina a variavel com o secret gerado no painel do Mercado Pago.',
    )
    return false
  }

  const xSignature = request.headers['x-signature']
  const xRequestId = request.headers['x-request-id']
  if (typeof xSignature !== 'string' || typeof xRequestId !== 'string') return false

  const dataId =
    request.query['data.id'] ??
    request.query.id ??
    (request.body as { data?: { id?: string }; id?: string }).data?.id ??
    (request.body as { id?: string }).id

  if (!dataId) return false

  const parts = Object.fromEntries(
    xSignature.split(',').map((part) => {
      const [key, value] = part.split('=')
      return [key, value]
    }),
  )

  const ts = parts.ts
  const receivedHash = parts.v1
  if (!ts || !receivedHash) return false

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const expectedHash = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  if (receivedHash.length !== expectedHash.length) return false
  return crypto.timingSafeEqual(Buffer.from(receivedHash), Buffer.from(expectedHash))
}
