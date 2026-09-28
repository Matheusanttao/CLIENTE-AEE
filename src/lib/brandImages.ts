/**
 * Fotos de vitrine da A&E Total Mix (Unsplash, licenca livre) em cenarios neutros/bege.
 * Usadas no banner, nas vitrines de categoria e como imagem padrao de categorias.
 * Troque por fotos proprias da loja quando houver.
 */
export function unsplashUrl(photoId: string, width: number, height?: number) {
  const size = height ? `&w=${width}&h=${height}&fit=crop` : `&w=${width}`
  return `https://images.unsplash.com/${photoId}?auto=format&q=80${size}`
}

const photos = {
  /** Tenis branco sobre tecido bege */
  sneakerBeige: 'photo-1622760807800-66cf1466fc08',
  /** Tenis branco sendo calcado, fundo bege claro */
  sneakerOnFoot: 'photo-1622760806364-5ccac8096b59',
  /** Tenis cano baixo vermelho e branco */
  sneakerRed: 'photo-1656944227421-416b1d2186c9',
  /** Tenis branco em fundo claro (horizontal) */
  sneakerWhite: 'photo-1587563871167-1ee9c731aefb',
  /** Perfume sobre pedras, fundo bege */
  perfumeStones: 'photo-1705899853374-d91c048b81d2',
  /** Perfume ambar sobre superficie bege */
  perfumeAmber: 'photo-1733660227168-444e3c751a1e',
  /** Perfume em suporte branco, fundo bege rosado */
  perfumeStand: 'photo-1708486855543-6010a133280f',
} as const

export type BrandPhoto = keyof typeof photos

export function brandPhoto(name: BrandPhoto, width: number, height?: number) {
  return unsplashUrl(photos[name], width, height)
}

/** Artes proprias da loja, servidas de `public/`. */
export const storeImages = {
  heroBanner: '/hero-banner.webp',
  collectionSneakers: '/collection-sneakers.webp',
  collectionPerfumes: '/collection-perfumes.webp',
} as const

export const brandImages = {
  heroBanner: storeImages.heroBanner,
  heroSneaker: brandPhoto('sneakerBeige', 1400),
  heroPerfume: brandPhoto('perfumeStones', 1200),
  categorySneakers: brandPhoto('sneakerRed', 800, 1000),
  categoryPerfumes: brandPhoto('perfumeAmber', 800, 1000),
  categoryDefault: brandPhoto('sneakerWhite', 800, 800),
} as const
