import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdminUser } from '../_lib/auth'
import { createSuperFreteCartForOrder } from '../_lib/superfrete'

interface Body {
  orderId?: string
}

/**
 * Admin: envia/reenvia pedido pago para o carrinho da SuperFrete.
 * Use para pedidos antigos que pagaram antes da integracao automatica.
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  try {
    await requireAdminUser(request)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNAUTHORIZED'
    const status = message === 'FORBIDDEN' ? 403 : 401
    return response.status(status).json({ message })
  }

  const body = (request.body ?? {}) as Body
  const orderId = body.orderId?.trim()
  if (!orderId) return response.status(400).json({ message: 'orderId e obrigatorio' })

  const result = await createSuperFreteCartForOrder(orderId)
  if (!result.ok) {
    return response.status(502).json({ message: result.message ?? 'Falha SuperFrete' })
  }

  return response.status(200).json({
    ok: true,
    cartId: result.cartId,
    message: result.message ?? 'Pedido adicionado ao carrinho SuperFrete',
  })
}
