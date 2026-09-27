import { supabase } from '../lib/supabase'
import type { ProductFlavor } from '../types'

export async function getFlavorsByProduct(productId: string) {
  const { data, error } = await supabase
    .from('produto_sabores')
    .select('*')
    .eq('produto_id', productId)
    .order('nome', { ascending: true })

  if (error) throw error
  return (data ?? []) as ProductFlavor[]
}

export async function replaceProductFlavors(
  productId: string,
  flavors: Array<{ nome: string; estoque: number; ativo?: boolean }>,
) {
  const cleaned = flavors
    .map((flavor) => ({
      nome: flavor.nome.trim(),
      estoque: Math.max(0, Number(flavor.estoque) || 0),
      ativo: flavor.ativo ?? true,
    }))
    .filter((flavor) => flavor.nome.length > 0)

  const { error: deleteError } = await supabase.from('produto_sabores').delete().eq('produto_id', productId)
  if (deleteError) throw deleteError

  if (cleaned.length === 0) return []

  const { data, error } = await supabase
    .from('produto_sabores')
    .insert(cleaned.map((flavor) => ({ ...flavor, produto_id: productId })))
    .select()

  if (error) throw error
  return (data ?? []) as ProductFlavor[]
}

export function availableFlavors(flavors: ProductFlavor[] | undefined) {
  return (flavors ?? []).filter((flavor) => flavor.ativo && flavor.estoque > 0)
}

export function productRequiresFlavor(flavors: ProductFlavor[] | undefined) {
  return (flavors ?? []).some((flavor) => flavor.ativo)
}
