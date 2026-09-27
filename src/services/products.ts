import { supabase } from '../lib/supabase'
import type { CatalogFilters, Product } from '../types'

const withImages = '*, imagens_produtos(*), produto_sabores(*)'
const homeProductsLimit = 8

interface BestSellerRow {
  produto_id: string
  total_vendido: number
}

/** Produto visivel na loja (ativo=false oculta; sem coluna/null continua visivel). */
function isListed(product: Product) {
  return product.ativo !== false
}

export async function getProducts(filters: CatalogFilters = {}) {
  const page = filters.page ?? 1
  const pageSize = 12
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // Nao filtra ativo no SQL: se a coluna ainda nao existir no Supabase, a loja quebrava toda.
  let query = supabase.from('produtos').select(withImages, { count: 'exact' }).range(from, to)

  if (filters.search) query = query.ilike('nome', `%${filters.search}%`)
  if (filters.categoria) query = query.eq('categoria', filters.categoria)
  if (filters.marca) query = query.eq('marca', filters.marca)
  if (filters.min) query = query.gte('preco', filters.min)
  if (filters.max) query = query.lte('preco', filters.max)

  if (filters.sort === 'price-asc') query = query.order('preco', { ascending: true })
  else if (filters.sort === 'price-desc') query = query.order('preco', { ascending: false })
  else if (filters.sort === 'rating') query = query.order('avaliacao_media', { ascending: false })
  else query = query.order('criado_em', { ascending: false })

  const { data, error, count } = await query
  if (error) throw error

  const products = ((data ?? []) as Product[]).filter(isListed)
  // Contagem aproximada quando ha ocultos na pagina; suficiente sem depender da coluna.
  const hiddenOnPage = (data?.length ?? 0) - products.length
  const adjustedCount = Math.max(0, (count ?? 0) - hiddenOnPage)

  return { products, count: adjustedCount, pageSize }
}

export async function getAvailableProductCategories() {
  const { data, error } = await supabase
    .from('produtos')
    .select('categoria')
    .eq('ativo', true)

  if (error) throw error

  return [...new Set((data ?? []).map((product) => product.categoria?.trim()).filter(Boolean) as string[])]
}

/** Marcas reais dos produtos ativos (sem duplicadas, sem vazias, em ordem alfabetica). */
export async function getAvailableProductBrands() {
  const { data, error } = await supabase
    .from('produtos')
    .select('marca')
    .eq('ativo', true)

  if (error) throw error

  const brands = (data ?? []).map((product) => product.marca?.trim()).filter(Boolean) as string[]
  return [...new Set(brands)].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
}

export async function getBestSellingProducts() {
  const { data: salesData, error: salesError } = await supabase.rpc('produtos_mais_vendidos', {
    p_limite: homeProductsLimit,
  })

  // Mantem os destaques como fallback enquanto a loja ainda nao tem vendas
  // ou enquanto a migration da funcao ainda nao foi aplicada.
  const sales = salesError ? [] : ((salesData ?? []) as BestSellerRow[])
  const soldIds = sales.map((sale) => sale.produto_id)

  const soldProductsPromise =
    soldIds.length > 0
      ? supabase.from('produtos').select(withImages).in('id', soldIds)
      : Promise.resolve({ data: [], error: null })

  const featuredProductsPromise = supabase
    .from('produtos')
    .select(withImages)
    .eq('destaque', true)
    .order('criado_em', { ascending: false })
    .limit(homeProductsLimit)

  const [soldResult, featuredResult] = await Promise.all([soldProductsPromise, featuredProductsPromise])
  if (soldResult.error) throw soldResult.error
  if (featuredResult.error) throw featuredResult.error

  const soldProducts = ((soldResult.data ?? []) as Product[]).filter(isListed)
  const soldById = new Map(soldProducts.map((product) => [product.id, product]))
  const orderedBestSellers = soldIds
    .map((id) => soldById.get(id))
    .filter((product): product is Product => Boolean(product))

  const selectedIds = new Set(orderedBestSellers.map((product) => product.id))
  const fallbackProducts = ((featuredResult.data ?? []) as Product[]).filter(
    (product) => isListed(product) && !selectedIds.has(product.id),
  )

  return [...orderedBestSellers, ...fallbackProducts].slice(0, homeProductsLimit)
}

export async function getProductBySlug(slug: string) {
  const { data, error } = await supabase.from('produtos').select(withImages).eq('slug', slug).maybeSingle()
  if (error) throw error
  if (!data || !isListed(data as Product)) {
    throw Object.assign(new Error('Produto não encontrado'), { code: 'PGRST116' })
  }
  return data as Product
}

export async function getRelatedProducts(product: Product) {
  const { data, error } = await supabase
    .from('produtos')
    .select(withImages)
    .eq('categoria', product.categoria)
    .neq('id', product.id)
    .limit(8)
  if (error) throw error
  return ((data ?? []) as Product[]).filter(isListed).slice(0, 4)
}
