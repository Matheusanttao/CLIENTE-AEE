import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuthUser } from '../_lib/auth'
import { createSuperFreteCartForOrder } from '../_lib/superfrete'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin'

interface Body {
  orderId?: string
  /** CPF do destinatario (obrigatorio se ainda nao estiver no perfil). */
  cpf?: string
}

const onlyDigits = (value: string) => value.replace(/\D/g, '')

function isValidCpf(raw: string): boolean {
  const cpf = onlyDigits(raw)
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  const calc = (base: string, factor: number) => {
    let sum = 0
    for (let i = 0; i < base.length; i += 1) sum += Number(base[i]) * (factor - i)
    const mod = (sum * 10) % 11
    return mod === 10 ? 0 : mod
  }
  return calc(cpf.slice(0, 9), 10) === Number(cpf[9]) && calc(cpf.slice(0, 10), 11) === Number(cpf[10])
}

/**
 * Cliente autenticado: gera/reenvia frete no carrinho SuperFrete para pedido pago.
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  let authUser
  try {
    authUser = await requireAuthUser(request)
  } catch {
    return response.status(401).json({ message: 'Nao autenticado' })
  }

  const body = (request.body ?? {}) as Body
  const orderId = body.orderId?.trim()
  if (!orderId) return response.status(400).json({ message: 'orderId e obrigatorio' })

  const supabase = getSupabaseAdmin()
  const { data: order, error } = await supabase
    .from('pedidos')
    .select('id, usuario_id, status')
    .eq('id', orderId)
    .maybeSingle()

  if (error) return response.status(500).json({ message: error.message })
  if (!order) return response.status(404).json({ message: 'Pedido nao encontrado' })
  if (order.usuario_id !== authUser.id) {
    return response.status(403).json({ message: 'Pedido nao pertence ao usuario' })
  }
  if (order.status !== 'aprovado') {
    return response.status(400).json({ message: 'So pedidos aprovados geram frete na SuperFrete' })
  }

  const cpf = body.cpf ? onlyDigits(body.cpf) : ''
  if (cpf) {
    if (!isValidCpf(cpf)) {
      return response.status(400).json({ message: 'CPF invalido' })
    }
    const { error: profileError } = await supabase
      .from('usuarios')
      .update({ cpf })
      .eq('id', authUser.id)
    if (profileError && !String(profileError.message).includes('cpf')) {
      console.warn('[push-order] nao salvou cpf', profileError.message)
    }

    // Atualiza snapshot do pedido (melhor esforco; ignora se coluna/json antigo).
    const { data: current } = await supabase
      .from('pedidos')
      .select('endereco_snapshot')
      .eq('id', orderId)
      .maybeSingle()
    if (current?.endereco_snapshot && typeof current.endereco_snapshot === 'object') {
      await supabase
        .from('pedidos')
        .update({
          endereco_snapshot: {
            ...(current.endereco_snapshot as Record<string, unknown>),
            cpf,
          },
        })
        .eq('id', orderId)
    }
  }

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
