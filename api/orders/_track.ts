import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientIp, rateLimit } from '../_lib/rateLimit'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ORDER_PREFIX_RE = /^[0-9a-f]{8,32}$/i

/** Resposta generica — evita enumeracao de e-mails/pedidos. */
const NOT_FOUND = { message: 'Pedido nao encontrado para este e-mail' }

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  if (!rateLimit(`track-order:${getClientIp(request)}`, 10, 60_000)) {
    return response.status(429).json({ message: 'Muitas tentativas. Aguarde alguns instantes.' })
  }

  const { orderId, email } = request.body as { orderId?: string; email?: string }
  const normalizedId = orderId?.trim().toLowerCase().replace(/^#/, '') ?? ''
  const normalizedEmail = email?.trim().toLowerCase() ?? ''

  if (!normalizedId || !normalizedEmail || !normalizedEmail.includes('@')) {
    return response.status(400).json({ message: 'Informe o numero do pedido e o e-mail' })
  }

  // Aceita UUID completo ou prefixo de no minimo 8 hex (como exibido na UI).
  const isFullUuid = UUID_RE.test(normalizedId)
  const isPrefix = !isFullUuid && ORDER_PREFIX_RE.test(normalizedId)
  if (!isFullUuid && !isPrefix) {
    return response.status(400).json({ message: 'Numero do pedido invalido' })
  }
  if (isPrefix && normalizedId.length < 8) {
    return response.status(400).json({ message: 'Informe ao menos 8 caracteres do numero do pedido' })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { data: user, error: userError } = await supabaseAdmin
    .from('usuarios')
    .select('id')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  if (userError) {
    console.error('[track-order] user lookup', userError.message)
    return response.status(500).json({ message: 'Erro ao buscar pedido' })
  }
  if (!user) return response.status(404).json(NOT_FOUND)

  const selectFields =
    'id, status, total, criado_em, frete_servico, frete_transportadora, frete_prazo_dias, codigo_rastreio, url_rastreio, etiqueta_gerada_em, postado_em, entregue_em'

  let orderQuery = supabaseAdmin
    .from('pedidos')
    .select(selectFields)
    .eq('usuario_id', user.id)

  if (isFullUuid) {
    orderQuery = orderQuery.eq('id', normalizedId)
  } else {
    // Prefixo com >= 8 hex reduz enumeracao; filter no banco evita varrer todos os pedidos.
    orderQuery = orderQuery.like('id', `${normalizedId}%`).limit(2)
  }

  const { data: orders, error } = await orderQuery

  if (error) {
    console.error('[track-order] order lookup', error.message)
    return response.status(500).json({ message: 'Erro ao buscar pedido' })
  }

  if (!orders?.length || orders.length > 1) {
    return response.status(404).json(NOT_FOUND)
  }

  return response.status(200).json(orders[0])
}
