import { brandImages, brandPhoto } from '../lib/brandImages'

export type SiteCategory = {
  name: string
  label: string
  image: string
  show_in_nav: boolean
}

export type SiteSettings = {
  store_name: string
  store_name_short: string
  store_tagline: string
  logo_enabled: boolean
  logo_url: string
  logo_show_text: boolean
  logo_as_favicon: boolean
  support_email: string
  whatsapp_number: string
  whatsapp_message: string
  whatsapp_button_enabled: boolean

  color_brand: string
  color_brand_hover: string
  color_ink: string
  color_promo: string

  topbar_enabled: boolean
  topbar_text: string

  free_shipping_enabled: boolean
  free_shipping_threshold: number
  free_shipping_label: string

  pix_discount_enabled: boolean
  pix_discount_percent: number
  installments_text: string

  hero_eyebrow: string
  hero_title: string
  hero_title_highlight: string
  hero_subtitle: string
  hero_cta_label: string
  hero_image_url: string

  meta_title: string
  meta_description: string

  trust_1_title: string
  trust_1_text: string
  trust_2_title: string
  trust_2_text: string
  trust_3_title: string
  trust_3_text: string
  trust_4_title: string
  trust_4_text: string

  benefit_pix_title: string
  benefit_pix_text: string
  benefit_shipping_title: string
  benefit_shipping_text: string
  benefit_card_title: string
  benefit_card_text: string

  newsletter_title: string
  newsletter_subtitle: string

  footer_about: string
  footer_secure_text: string

  promo_banner_enabled: boolean
  promo_banner_text: string

  categories: SiteCategory[]
}

/** Imagem padrao ao criar categoria vazia no admin (nao exposta na loja sozinha). */
export const DEFAULT_CATEGORY_IMAGE = brandImages.categoryDefault

/**
 * Sugestoes opcionais no painel admin — NAO sao aplicadas automaticamente na loja.
 * A loja so mostra categorias salvas em Configuracoes (botao "Usar sugestoes").
 */
export const suggestedCategories: SiteCategory[] = [
  {
    name: 'Tênis',
    label: 'Tênis',
    image: brandImages.categorySneakers,
    show_in_nav: true,
  },
  {
    name: 'Perfumes',
    label: 'Perfumes',
    image: brandImages.categoryPerfumes,
    show_in_nav: true,
  },
  {
    name: 'Tênis Masculino',
    label: 'Masculino',
    image: brandPhoto('sneakerWhite', 800, 1000),
    show_in_nav: true,
  },
  {
    name: 'Tênis Feminino',
    label: 'Feminino',
    image: brandPhoto('sneakerOnFoot', 800, 1000),
    show_in_nav: true,
  },
  {
    name: 'Perfumes Importados',
    label: 'Importados',
    image: brandPhoto('perfumeStand', 800, 1000),
    show_in_nav: true,
  },
]

/** @deprecated Use suggestedCategories — mantido so para imports legados */
export const defaultCategories = suggestedCategories

export const defaultSiteSettings: SiteSettings = {
  store_name: 'A&E Total Mix',
  store_name_short: 'A&E Total Mix',
  store_tagline: 'Varejo e Atacado',
  logo_enabled: true,
  logo_url: '/aee-wordmark.webp',
  logo_show_text: false,
  logo_as_favicon: false,
  support_email: 'contato@fitstore.com.br',
  whatsapp_number: '5511999999999',
  whatsapp_message: 'Olá! Gostaria de atendimento da A&E Total Mix.',
  whatsapp_button_enabled: true,

  color_brand: '#0057F5',
  color_brand_hover: '#0042C4',
  color_ink: '#0B1220',
  color_promo: '#E11D2F',

  topbar_enabled: true,
  topbar_text: 'Varejo e atacado · Enviamos para todo o Brasil',

  free_shipping_enabled: true,
  free_shipping_threshold: 199,
  free_shipping_label: 'Frete grátis',

  pix_discount_enabled: true,
  pix_discount_percent: 10,
  installments_text: 'Parcele em até 12x',

  hero_eyebrow: 'Varejo e atacado',
  hero_title: 'Tênis e perfumes',
  hero_title_highlight: 'para o seu estilo',
  hero_subtitle: 'Escolha para você ou compre em quantidade para revender. Atendimento direto pelo WhatsApp.',
  hero_cta_label: 'Ver produtos',
  hero_image_url: brandImages.heroSneaker,

  meta_title: 'A&E Total Mix | Tênis e Perfumes no Varejo e Atacado',
  meta_description:
    'A&E Total Mix: tênis, perfumes e muito mais no varejo e no atacado. Compre online com pagamento seguro e envio para todo o Brasil.',

  trust_1_title: 'Varejo e atacado',
  trust_1_text: 'Compre uma unidade ou em quantidade',
  trust_2_title: 'Envio para todo o Brasil',
  trust_2_text: 'Frete calculado no carrinho',
  trust_3_title: 'Pagamento seguro',
  trust_3_text: 'Pix e cartão pelo Mercado Pago',
  trust_4_title: 'Atendimento no WhatsApp',
  trust_4_text: 'Tire dúvidas antes de comprar',

  benefit_pix_title: '10% OFF no Pix',
  benefit_pix_text: 'Desconto à vista em toda loja',
  benefit_shipping_title: 'Frete grátis',
  benefit_shipping_text: 'Em compras acima de R$199',
  benefit_card_title: 'Parcele em até 12x',
  benefit_card_text: 'No cartão de crédito',

  newsletter_title: 'Receba novidades',
  newsletter_subtitle: 'Cadastre seu e-mail para saber de lançamentos e ofertas.',

  footer_about: 'A&E Total Mix: tênis, perfumes e muito mais no varejo e no atacado.',
  footer_secure_text: 'Compra segura Mercado Pago',

  promo_banner_enabled: false,
  promo_banner_text: '',

  categories: [],
}

/**
 * Valores da identidade anterior (Passarin/Fit Suplementos) que ainda podem estar salvos no banco.
 * Quando encontrados, dao lugar aos padroes da A&E Total Mix. Valores personalizados pelo admin sao mantidos.
 */
const legacyBrandText = /passari[nm]|fit ?suplement|suplement|betim|whey|creatina/i
const legacyColors = new Set([
  '#c4f000',
  '#b2dd00',
  '#0d0f12',
  '#dc2626',
  // Paleta azul anterior, com contraste baixo demais para o layout atual.
  '#0066ff',
  '#0052cc',
  '#101828',
])
const legacyImages = new Set(['/passarin-logo.png', '/hero-athlete.png'])

const legacyTextDefaults: Partial<Record<keyof SiteSettings, string[]>> = {
  store_tagline: ['Suplementos'],
  topbar_text: ['Frete grátis para todo Brasil acima de R$199'],
  hero_eyebrow: ['Supere seus limites'],
  hero_title: ['Mais energia. Mais foco.'],
  hero_title_highlight: ['Melhores resultados.'],
  hero_cta_label: ['Compre agora'],
  trust_1_title: ['Produtos 100% originais'],
  trust_1_text: ['Qualidade garantida'],
  trust_2_title: ['Entrega rapida'],
  trust_2_text: ['Para todo o Brasil'],
  trust_3_text: ['Ambiente 100% seguro'],
  trust_4_title: ['Atendimento especializado'],
  trust_4_text: ['Suporte via WhatsApp'],
  newsletter_title: ['Receba ofertas exclusivas'],
  newsletter_subtitle: ['Cadastre seu e-mail e ganhe 10% OFF na primeira compra.'],
  promo_banner_text: ['Promoção especial: frete grátis + desconto no Pix!'],
}

const brandTextKeys = [
  'store_tagline',
  'whatsapp_message',
  'topbar_text',
  'hero_eyebrow',
  'hero_title',
  'hero_title_highlight',
  'hero_subtitle',
  'hero_cta_label',
  'meta_title',
  'meta_description',
  'trust_1_title',
  'trust_1_text',
  'trust_2_title',
  'trust_2_text',
  'trust_3_title',
  'trust_3_text',
  'trust_4_title',
  'trust_4_text',
  'newsletter_title',
  'newsletter_subtitle',
  'footer_about',
  'promo_banner_text',
] as const

export function mergeSiteSettings(partial?: Partial<SiteSettings> | null): SiteSettings {
  const merged = { ...defaultSiteSettings, ...(partial ?? {}) }
  const d = defaultSiteSettings

  const legacyStore = legacyBrandText.test(partial?.store_name ?? '') || legacyBrandText.test(partial?.store_name_short ?? '')
  if (legacyStore) {
    merged.store_name = d.store_name
    merged.store_name_short = d.store_name_short
    merged.logo_enabled = true
    merged.logo_show_text = d.logo_show_text
    merged.logo_as_favicon = d.logo_as_favicon
  }
  if (legacyStore || legacyImages.has(merged.logo_url?.trim())) merged.logo_url = d.logo_url
  if (legacyStore || legacyImages.has(merged.hero_image_url?.trim()) || !merged.hero_image_url?.trim()) {
    merged.hero_image_url = d.hero_image_url
  }

  if (legacyColors.has(merged.color_brand?.toLowerCase())) merged.color_brand = d.color_brand
  if (legacyColors.has(merged.color_brand_hover?.toLowerCase())) merged.color_brand_hover = d.color_brand_hover
  if (legacyColors.has(merged.color_ink?.toLowerCase())) merged.color_ink = d.color_ink
  if (legacyColors.has(merged.color_promo?.toLowerCase())) merged.color_promo = d.color_promo

  for (const key of brandTextKeys) {
    const value = partial?.[key]?.trim()
    if (key === 'promo_banner_text') {
      if (value && (legacyBrandText.test(value) || legacyTextDefaults[key]?.includes(value))) merged[key] = d[key]
      continue
    }
    if (!value || legacyBrandText.test(value) || legacyTextDefaults[key]?.includes(value)) merged[key] = d[key]
  }

  if (!Array.isArray(merged.categories)) {
    merged.categories = []
  } else {
    merged.categories = merged.categories
      .map((category) => ({
        name: category.name?.trim() || '',
        label: category.label?.trim() || category.name?.trim() || '',
        image: category.image?.trim() || DEFAULT_CATEGORY_IMAGE,
        show_in_nav: category.show_in_nav !== false,
      }))
      .filter((category) => category.name.length >= 2)
  }
  return merged
}

export function buildWhatsappUrl(number: string, message: string) {
  const digits = number.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function darkenHex(hex: string, amount = 0.3): string {
  const cleaned = hex.replace('#', '')
  if (cleaned.length !== 6) return hex
  const num = Number.parseInt(cleaned, 16)
  const mix = (channel: number) => Math.round(channel * (1 - amount))
  return `#${[mix((num >> 16) & 255), mix((num >> 8) & 255), mix(num & 255)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`
}

export function lightenHex(hex: string, amount = 0.55): string {
  const cleaned = hex.replace('#', '')
  if (cleaned.length !== 6) return hex
  const num = Number.parseInt(cleaned, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount)
  return `#${[mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
