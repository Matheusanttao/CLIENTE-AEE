import { useCallback, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { useAvailableProductCategories } from '../hooks/useProducts'

/** Rota usada no menu como "Promoções" (catálogo ordenado pelo menor preço). */
export const PROMO_CATALOG_PATH = '/catalogo?sort=price-asc'

export const categoryCatalogPath = (name: string) => `/catalogo?categoria=${encodeURIComponent(name)}`

/**
 * Miniatura leve para as listas de categorias do menu (as imagens cadastradas costumam ser grandes).
 * Suporta Cloudinary e Unsplash; outras URLs sao usadas como estao.
 */
export function categoryThumbUrl(url: string, size = 96) {
  if (!url) return url
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,c_fill,w_${size},h_${size}/`)
  }
  if (url.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(url)
      parsed.searchParams.set('w', String(size))
      parsed.searchParams.set('h', String(size))
      parsed.searchParams.set('fit', 'crop')
      return parsed.toString()
    } catch {
      return url
    }
  }
  return url
}

/**
 * Categorias cadastradas em Configurações que possuem produtos disponíveis.
 * `navCategories`: marcadas para aparecer na barra; `allCategories`: todas (menu e gaveta mobile).
 */
export function useHeaderCategories() {
  const { settings } = useSiteSettings()
  const { data: availableCategories = [] } = useAvailableProductCategories()

  const availableCategorySet = new Set(availableCategories)
  const navCategories = settings.categories.filter(
    (category) => category.show_in_nav && availableCategorySet.has(category.name),
  )
  const allCategories = settings.categories.filter(
    (category) => category.name.trim() && availableCategorySet.has(category.name),
  )

  return { navCategories, allCategories }
}

/** Chave da rota atual: menus abertos fecham sozinhos quando ela muda. */
export function useRouteKey() {
  const location = useLocation()
  return `${location.pathname}${location.search}`
}

/**
 * Aberto/fechado de um menu preso a rota em que foi aberto: fecha sozinho quando a rota muda
 * (links, voltar/avancar do navegador) e nao reabre se o cliente voltar depois para essa rota.
 */
export function useRouteScopedOpen() {
  const routeKey = useRouteKey()
  const [openAt, setOpenAt] = useState<string | null>(null)
  // Ajuste de estado durante o render: descarta a rota guardada assim que ela deixa de ser a atual.
  if (openAt !== null && openAt !== routeKey) setOpenAt(null)

  const open = openAt === routeKey
  const openMenu = useCallback(() => setOpenAt(routeKey), [routeKey])
  const close = useCallback(() => setOpenAt(null), [])
  const toggle = useCallback(
    () => setOpenAt((current) => (current === routeKey ? null : routeKey)),
    [routeKey],
  )

  return { open, openMenu, close, toggle }
}

/** Estado ativo dos links de catálogo (todos, categoria e promoções). */
export function useCatalogLinkState() {
  const location = useLocation()
  const onCatalog = location.pathname === '/catalogo'
  const params = new URLSearchParams(location.search)
  const category = onCatalog ? params.get('categoria') : null
  const sort = onCatalog ? params.get('sort') : null
  const search = onCatalog ? params.get('busca') : null

  return {
    isAllActive: onCatalog && !category && sort !== 'price-asc' && !search,
    isPromoActive: onCatalog && !category && sort === 'price-asc',
    isCategoryActive: (name: string) => category === name,
  }
}
