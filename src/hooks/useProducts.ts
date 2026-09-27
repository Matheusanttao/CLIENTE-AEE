import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  getAvailableProductBrands,
  getAvailableProductCategories,
  getBestSellingProducts,
  getProductBySlug,
  getProducts,
  getRelatedProducts,
} from '../services/products'
import type { CatalogFilters, Product } from '../types'

/**
 * Lista paginada do catalogo.
 * `keepPrevious` mantem a pagina anterior na tela enquanto os novos filtros carregam
 * (evita a grade "piscar" com skeletons a cada troca de filtro ou de pagina).
 */
export const useProducts = (filters: CatalogFilters, options: { keepPrevious?: boolean } = {}) =>
  useQuery({
    queryKey: ['products', filters],
    queryFn: () => getProducts(filters),
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
  })

export const useAvailableProductCategories = () =>
  useQuery({
    queryKey: ['products', 'available-categories'],
    queryFn: getAvailableProductCategories,
  })

export const useAvailableProductBrands = () =>
  useQuery({
    queryKey: ['products', 'available-brands'],
    queryFn: getAvailableProductBrands,
  })

export const useBestSellingProducts = () =>
  useQuery({
    queryKey: ['products', 'best-selling'],
    queryFn: getBestSellingProducts,
  })

export const useProduct = (slug: string) =>
  useQuery({
    queryKey: ['product', slug],
    queryFn: () => getProductBySlug(slug),
    enabled: Boolean(slug),
  })

export const useRelatedProducts = (product?: Product) =>
  useQuery({
    queryKey: ['products', 'related', product?.id],
    queryFn: () => getRelatedProducts(product as Product),
    enabled: Boolean(product),
  })
