import { supabase } from '../lib/supabase'
import type { Coupon, Product, ProductCategory } from '../types'

export async function getAllCustomers() {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, role, criado_em')
    .order('criado_em', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getAllCoupons() {
  const { data, error } = await supabase.from('cupons').select('*').order('criado_em', { ascending: false })
  if (error) throw error
  return (data ?? []) as Coupon[]
}

export async function createCoupon(input: Omit<Coupon, 'ativo'> & { ativo?: boolean }) {
  const { data, error } = await supabase
    .from('cupons')
    .insert({
      codigo: input.codigo.toUpperCase(),
      tipo: input.tipo,
      valor: input.valor,
      valor_minimo: input.valor_minimo,
      ativo: input.ativo ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return data as Coupon
}

export async function updateCoupon(
  codigo: string,
  input: Partial<Pick<Coupon, 'tipo' | 'valor' | 'valor_minimo' | 'ativo'>>,
) {
  const { data, error } = await supabase.from('cupons').update(input).eq('codigo', codigo).select().single()
  if (error) throw error
  return data as Coupon
}

export async function deleteCoupon(codigo: string) {
  const { error } = await supabase.from('cupons').delete().eq('codigo', codigo)
  if (error) throw error
}

export async function updateProduct(
  productId: string,
  input: Partial<{
    nome: string
    descricao: string
    categoria: ProductCategory
    marca: string
    preco: number
    preco_promocional: number | null
    estoque: number
    peso_kg: number
    altura_cm: number
    largura_cm: number
    comprimento_cm: number
    destaque: boolean
    ativo: boolean
  }>,
) {
  const { data, error } = await supabase.from('produtos').update(input).eq('id', productId).select().single()
  if (error) throw error
  return data as Product
}

/**
 * Exclui o produto se nunca foi vendido.
 * Se ja existir em itens_pedido, apenas desativa (some da loja, preserva historico).
 */
export async function deleteProduct(productId: string): Promise<{ mode: 'deleted' | 'deactivated' }> {
  const { count, error: countError } = await supabase
    .from('itens_pedido')
    .select('id', { count: 'exact', head: true })
    .eq('produto_id', productId)

  if (countError) throw countError

  if ((count ?? 0) > 0) {
    const { error: softError } = await supabase
      .from('produtos')
      .update({ ativo: false, destaque: false })
      .eq('id', productId)

    if (softError) {
      if (softError.message?.includes('ativo') || softError.code === 'PGRST204') {
        throw new Error(
          'Este produto ja foi vendido e nao pode ser excluido. Rode a migration supabase/migration_produtos_ativo.sql no Supabase para poder ocultar da loja.',
        )
      }
      throw softError
    }

    return { mode: 'deactivated' }
  }

  const { error } = await supabase.from('produtos').delete().eq('id', productId)
  if (error) {
    if (error.code === '23503') {
      throw new Error(
        'Este produto esta ligado a pedidos e nao pode ser excluido. Ele sera apenas ocultado da loja.',
      )
    }
    throw error
  }

  return { mode: 'deleted' }
}

export async function reactivateProduct(productId: string) {
  const { data, error } = await supabase
    .from('produtos')
    .update({ ativo: true })
    .eq('id', productId)
    .select()
    .single()
  if (error) throw error
  return data as Product
}
