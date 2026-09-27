import type { SiteCategory } from '../types/settings'

/** Remove acentos e espacos extras para comparar nomes de categorias ("Tênis" === "tenis"). */
export const normalizeCategoryName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()

/** Colecoes fixas do banner da home. */
export const homeCollections = [
  { key: 'sneakers', label: 'Tênis', categoryNames: ['tenis'], search: 'tênis' },
  { key: 'perfumes', label: 'Perfumes', categoryNames: ['perfumes', 'perfume'], search: 'perfume' },
] as const

export type HomeCollection = (typeof homeCollections)[number]

/**
 * Link de uma colecao: usa a categoria cadastrada quando ela existe com produtos
 * (filtro exato no catalogo); senao cai na busca por nome.
 */
export function homeCollectionPath(collection: HomeCollection, categories: SiteCategory[]) {
  const names: readonly string[] = collection.categoryNames
  const match = categories.find((category) => names.includes(normalizeCategoryName(category.name)))
  return match
    ? `/catalogo?categoria=${encodeURIComponent(match.name)}`
    : `/catalogo?busca=${encodeURIComponent(collection.search)}`
}

/** true quando a categoria ja aparece como bloco fixo no banner (Tênis / Perfumes). */
export function isHomeCollectionCategory(category: SiteCategory) {
  const name = normalizeCategoryName(category.name)
  return homeCollections.some((collection) => (collection.categoryNames as readonly string[]).includes(name))
}
