import type { Product } from '../types'
import type { SiteSettings } from '../types/settings'

export const SITE_URL = 'https://passarinsuplementos.com.br'
export const SITE_NAME = 'Passarim Suplementos'
export const SITE_LOCALITY = 'Betim'
export const SITE_REGION = 'MG'
export const SITE_COUNTRY = 'BR'
export const DEFAULT_OG_IMAGE = `${SITE_URL}/passarin-logo.png`

export const DEFAULT_KEYWORDS = [
  'suplementos Betim',
  'loja de suplementos Betim',
  'whey protein Betim',
  'creatina Betim',
  'vitaminas Betim',
  'Passarim Suplementos',
  'suplementos fitness',
  'pré-treino Betim',
].join(', ')

export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalized}`
}

export function absoluteAssetUrl(path?: string | null) {
  if (!path?.trim()) return DEFAULT_OG_IMAGE
  if (/^https?:\/\//i.test(path)) return path
  return absoluteUrl(path.trim())
}

export function truncateText(value: string, max = 155) {
  const text = value.replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

export function buildProductDescription(product: Product) {
  const base = product.descricao?.trim()
    || `Compre ${product.nome} (${product.marca}) na Passarim Suplementos em Betim.`
  const withLocal = /betim/i.test(base) ? base : `${base} Disponível na Passarim Suplementos em Betim.`
  return truncateText(withLocal)
}

type BreadcrumbItem = { name: string; path: string }

export function buildOrganizationJsonLd(settings: SiteSettings) {
  const phone = settings.whatsapp_number?.replace(/\D/g, '')
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'Store', 'HealthAndBeautyBusiness'],
    '@id': `${SITE_URL}/#organization`,
    name: settings.store_name || SITE_NAME,
    url: SITE_URL,
    logo: absoluteAssetUrl(settings.logo_url),
    image: absoluteAssetUrl(settings.hero_image_url || settings.logo_url),
    description: settings.meta_description || settings.footer_about,
    email: settings.support_email || undefined,
    telephone: phone ? `+${phone}` : undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: SITE_LOCALITY,
      addressRegion: SITE_REGION,
      addressCountry: SITE_COUNTRY,
    },
    areaServed: [
      { '@type': 'City', name: SITE_LOCALITY },
      { '@type': 'Country', name: 'Brasil' },
    ],
  }
}

export function buildWebsiteJsonLd(settings: SiteSettings) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: settings.store_name || SITE_NAME,
    url: SITE_URL,
    description: settings.meta_description,
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'pt-BR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/catalogo?busca={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function buildLocalBusinessJsonLd(settings: SiteSettings) {
  const phone = settings.whatsapp_number?.replace(/\D/g, '')
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': `${SITE_URL}/#localbusiness`,
    name: settings.store_name || SITE_NAME,
    url: SITE_URL,
    image: absoluteAssetUrl(settings.hero_image_url || settings.logo_url),
    description: settings.meta_description || settings.footer_about,
    email: settings.support_email || undefined,
    telephone: phone ? `+${phone}` : undefined,
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      addressLocality: SITE_LOCALITY,
      addressRegion: SITE_REGION,
      addressCountry: SITE_COUNTRY,
    },
    areaServed: {
      '@type': 'City',
      name: SITE_LOCALITY,
    },
  }
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function buildProductJsonLd(product: Product) {
  const price = product.preco_promocional ?? product.preco
  const images = (product.imagens_produtos ?? [])
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .map((image) => absoluteAssetUrl(image.url))
  const availability =
    product.estoque > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.nome,
    description: buildProductDescription(product),
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: product.marca,
    },
    category: product.categoria,
    image: images.length > 0 ? images : [DEFAULT_OG_IMAGE],
    url: absoluteUrl(`/produto/${product.slug}`),
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(`/produto/${product.slug}`),
      priceCurrency: 'BRL',
      price: Number(price).toFixed(2),
      availability,
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
    },
    ...(product.total_avaliacoes > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(product.avaliacao_media || 0).toFixed(1),
            reviewCount: product.total_avaliacoes,
          },
        }
      : {}),
  }
}

export function buildCollectionPageJsonLd(options: {
  name: string
  description: string
  path: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: options.name,
    description: options.description,
    url: absoluteUrl(options.path),
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: {
      '@type': 'Thing',
      name: `Suplementos em ${SITE_LOCALITY}`,
    },
  }
}
