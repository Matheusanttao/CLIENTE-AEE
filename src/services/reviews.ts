import { supabase } from '../lib/supabase'

export interface Review {
  id: string
  usuario_id?: string
  produto_id: string
  nota: number
  comentario: string | null
  aprovado: boolean
  criado_em: string
  usuarios?: { nome: string } | null
}

const PURCHASED_STATUSES = ['aprovado', 'preparando', 'enviado', 'entregue'] as const

export async function getProductReviews(productId: string) {
  const { data, error } = await supabase
    .from('avaliacoes_publicas')
    .select('id, produto_id, nota, comentario, aprovado, criado_em, nome_usuario')
    .eq('produto_id', productId)
    .order('criado_em', { ascending: false })

  if (error) throw error
  return (data ?? []).map(({ nome_usuario, ...review }) => ({
    ...review,
    usuarios: { nome: nome_usuario },
  })) as Review[]
}

export async function getMyReviewForProduct(userId: string, productId: string) {
  const { data, error } = await supabase
    .from('avaliacoes')
    .select('*')
    .eq('usuario_id', userId)
    .eq('produto_id', productId)
    .maybeSingle()

  if (error) throw error
  return data as Review | null
}

/** Cliente so pode avaliar se ja comprou o produto (pedido pago/enviado/entregue). */
export async function hasPurchasedProduct(userId: string, productId: string) {
  const { data, error } = await supabase
    .from('itens_pedido')
    .select('id, pedidos!inner(id, usuario_id, status)')
    .eq('produto_id', productId)
    .eq('pedidos.usuario_id', userId)
    .in('pedidos.status', [...PURCHASED_STATUSES])
    .limit(1)

  if (error) throw error
  return (data?.length ?? 0) > 0
}

export async function submitReview(input: {
  userId: string
  productId: string
  nota: number
  comentario?: string
}) {
  const purchased = await hasPurchasedProduct(input.userId, input.productId)
  if (!purchased) {
    throw new Error('So e possivel avaliar produtos que voce ja comprou.')
  }

  // Nao enviar `aprovado` — o banco/trigger controla moderacao (clientes nao autogestoram).
  const { data, error } = await supabase
    .from('avaliacoes')
    .upsert(
      {
        usuario_id: input.userId,
        produto_id: input.productId,
        nota: input.nota,
        comentario: input.comentario?.trim() || null,
      },
      { onConflict: 'usuario_id,produto_id' },
    )
    .select()
    .single()

  if (error) throw error
  return data as Review
}
