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
export const DEFAULT_CATEGORY_IMAGE = '/categories/proteinas.png'

/**
 * Sugestoes opcionais no painel admin — NAO sao aplicadas automaticamente na loja.
 * A loja so mostra categorias salvas em Configuracoes (botao "Usar sugestoes").
 */
export const suggestedCategories: SiteCategory[] = [
  {
    name: 'Proteínas',
    label: 'PROTEÍNAS',
    image: '/categories/proteinas.png',
    show_in_nav: true,
  },
  {
    name: 'Creatina',
    label: 'CREATINA',
    image: '/categories/creatina.png',
    show_in_nav: true,
  },
  {
    name: 'Pré-Treino e Energia',
    label: 'PRÉ-TREINO',
    image: '/categories/pre-treino.png',
    show_in_nav: true,
  },
  {
    name: 'Aminoácidos e Performance',
    label: 'AMINOÁCIDOS',
    image: '/categories/aminoacidos.png',
    show_in_nav: true,
  },
  {
    name: 'Vitaminas e Saúde',
    label: 'VITAMINAS',
    image: '/categories/vitaminas.png',
    show_in_nav: true,
  },
  {
    name: 'Emagrecimento',
    label: 'EMAGRECIMENTO',
    image: '/categories/emagrecimento.png',
    show_in_nav: true,
  },
  {
    name: 'Alimentos e Snacks',
    label: 'ALIMENTOS',
    image: '/categories/alimentos.png',
    show_in_nav: true,
  },
  {
    name: 'Acessórios',
    label: 'ACESSÓRIOS',
    image: '/categories/acessorios.png',
    show_in_nav: true,
  },
]

/** @deprecated Use suggestedCategories — mantido so para imports legados */
export const defaultCategories = suggestedCategories

export const defaultSiteSettings: SiteSettings = {
  store_name: 'Passarin Suplementos',
  store_name_short: 'Passarin',
  store_tagline: 'Suplementos em Betim',
  logo_enabled: true,
  logo_url: '/passarin-logo.png',
  logo_show_text: false,
  logo_as_favicon: true,
  support_email: 'contato@fitstore.com.br',
  whatsapp_number: '5511999999999',
  whatsapp_message: 'Ola! Preciso de ajuda com meu pedido na Passarin Suplementos.',
  whatsapp_button_enabled: true,

  color_brand: '#c4f000',
  color_brand_hover: '#b2dd00',
  color_ink: '#0d0f12',
  color_promo: '#dc2626',

  topbar_enabled: true,
  topbar_text: 'Frete grátis para todo Brasil acima de R$199',

  free_shipping_enabled: true,
  free_shipping_threshold: 199,
  free_shipping_label: 'Frete grátis',

  pix_discount_enabled: true,
  pix_discount_percent: 10,
  installments_text: 'Parcele em até 12x',

  hero_eyebrow: 'Loja de suplementos em Betim',
  hero_title: 'Mais energia. Mais foco.',
  hero_title_highlight: 'Melhores resultados.',
  hero_subtitle:
    'Whey protein, creatina, vitaminas e produtos fitness com qualidade garantida. Atendemos Betim e enviamos para todo o Brasil.',
  hero_cta_label: 'Compre agora',
  hero_image_url: '/hero-athlete.png',

  meta_title: 'Passarim Suplementos | Loja de Suplementos em Betim',
  meta_description:
    'Loja de suplementos em Betim: whey protein, creatina, vitaminas e produtos fitness na Passarim Suplementos. Entrega rápida e compra segura.',

  trust_1_title: 'Produtos 100% originais',
  trust_1_text: 'Qualidade garantida',
  trust_2_title: 'Entrega rapida',
  trust_2_text: 'Betim e todo o Brasil',
  trust_3_title: 'Pagamento seguro',
  trust_3_text: 'Ambiente 100% seguro',
  trust_4_title: 'Atendimento especializado',
  trust_4_text: 'Suporte via WhatsApp',

  benefit_pix_title: '10% OFF no Pix',
  benefit_pix_text: 'Desconto à vista em toda loja',
  benefit_shipping_title: 'Frete grátis',
  benefit_shipping_text: 'Em compras acima de R$199',
  benefit_card_title: 'Parcele em até 12x',
  benefit_card_text: 'No cartão de crédito',

  newsletter_title: 'Receba ofertas exclusivas',
  newsletter_subtitle: 'Cadastre seu e-mail e ganhe 10% OFF na primeira compra.',

  footer_about:
    'Passarim Suplementos em Betim: whey, creatina, vitaminas e produtos fitness com qualidade, ofertas e compra segura.',
  footer_secure_text: 'Compra segura Mercado Pago',

  promo_banner_enabled: false,
  promo_banner_text: 'Promoção especial: frete grátis + desconto no Pix!',

  categories: [],
}

const legacyMetaTitles = new Set([
  'Passarin Suplementos - Mais energia, foco e resultados',
  'Passarim Suplementos | Suplementos e Produtos Fitness',
])

const legacyMetaDescriptions = new Set([
  'Suplementos de qualidade, ofertas, frete gratis e compra segura.',
  'Encontre suplementos, whey protein, creatina, vitaminas e produtos fitness na Passarim Suplementos.',
])

const legacyHeroSubtitles = new Set([
  'Os melhores suplementos com qualidade garantida para potencializar seu treino e transformar seu corpo.',
])

const legacyFooterAbout = new Set([
  'Suplementos de qualidade, ofertas especiais e compra segura para todos os seus treinos.',
])

export function mergeSiteSettings(partial?: Partial<SiteSettings> | null): SiteSettings {
  const merged = { ...defaultSiteSettings, ...(partial ?? {}) }
  const storedName = partial?.store_name?.trim().toLocaleLowerCase('pt-BR')
  if (storedName === 'fit suplemento' || storedName === 'fit suplementos') {
    merged.store_name = defaultSiteSettings.store_name
    merged.store_name_short = defaultSiteSettings.store_name_short
    merged.logo_url = defaultSiteSettings.logo_url
    merged.logo_enabled = true
    merged.logo_show_text = defaultSiteSettings.logo_show_text
    merged.logo_as_favicon = defaultSiteSettings.logo_as_favicon
    merged.whatsapp_message = defaultSiteSettings.whatsapp_message
    merged.meta_title = defaultSiteSettings.meta_title
  }
  if (!partial?.meta_title?.trim() || legacyMetaTitles.has(partial.meta_title.trim())) {
    merged.meta_title = defaultSiteSettings.meta_title
  }
  if (
    !partial?.meta_description?.trim() ||
    legacyMetaDescriptions.has(partial.meta_description.trim()) ||
    !/betim/i.test(partial.meta_description)
  ) {
    merged.meta_description = defaultSiteSettings.meta_description
  }
  if (!partial?.hero_subtitle?.trim() || legacyHeroSubtitles.has(partial.hero_subtitle.trim())) {
    merged.hero_subtitle = defaultSiteSettings.hero_subtitle
  }
  if (!partial?.hero_eyebrow?.trim() || partial.hero_eyebrow.trim() === 'Supere seus limites') {
    merged.hero_eyebrow = defaultSiteSettings.hero_eyebrow
  }
  if (!partial?.footer_about?.trim() || legacyFooterAbout.has(partial.footer_about.trim())) {
    merged.footer_about = defaultSiteSettings.footer_about
  }
  if (!partial?.store_tagline?.trim() || partial.store_tagline.trim() === 'Suplementos') {
    merged.store_tagline = defaultSiteSettings.store_tagline
  }
  if (!partial?.trust_2_text?.trim() || partial.trust_2_text.trim() === 'Para todo o Brasil') {
    merged.trust_2_text = defaultSiteSettings.trust_2_text
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
