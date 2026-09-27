import { supabase } from '../lib/supabase'
import type { Product } from '../types'

export async function getMyFavorites(userId: string) {
  const { data, error } = await supabase
    .from('favoritos')
    .select('produto_id, criado_em, produtos(*, imagens_produtos(*))')
    .eq('usuario_id', userId)
    .order('criado_em', { ascending: false })

  if (error) throw error

  return (data ?? [])
    .map((row) => row.produtos as unknown as Product | null)
    .filter((product): product is Product => Boolean(product))
}

export async function getFavoriteProductIds(userId: string) {
  const { data, error } = await supabase
    .from('favoritos')
    .select('produto_id')
    .eq('usuario_id', userId)

  if (error) throw error
  return new Set((data ?? []).map((row) => row.produto_id))
}

export async function addFavorite(userId: string, productId: string) {
  const { error } = await supabase.from('favoritos').insert({ usuario_id: userId, produto_id: productId })
  if (error) throw error
}

export async function removeFavorite(userId: string, productId: string) {
  const { error } = await supabase
    .from('favoritos')
    .delete()
    .eq('usuario_id', userId)
    .eq('produto_id', productId)

  if (error) throw error
}
