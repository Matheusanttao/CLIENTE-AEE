import { useQuery } from '@tanstack/react-query'
import {
  getAvailableProductCategories,
  getBestSellingProducts,
  getProductBySlug,
  getProducts,
  getRelatedProducts,
} from '../services/products'
import type { CatalogFilters, Product } from '../types'

export const useProducts = (filters: CatalogFilters) =>
  useQuery({
    queryKey: ['products', filters],
    queryFn: () => getProducts(filters),
  })

export const useAvailableProductCategories = () =>
  useQuery({
    queryKey: ['products', 'available-categories'],
    queryFn: getAvailableProductCategories,
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
