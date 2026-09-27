export const PIX_DISCOUNT_PERCENT = 10

/** Limite maximo de peso por encomenda nos Correios */
export const CORREIOS_MAX_WEIGHT_KG = 30

export const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? '5511999999999'

export const whatsappUrl = (message = 'Ola! Preciso de ajuda com meu pedido na Passarin Suplementos.') =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`

/** Preferir useSiteSettings().settings.categories — vazio ate o admin configurar */
export const categories: string[] = []

export const categoryNavigation: { label: string; value: string; image: string }[] = []


export const brands = ['Growth', 'Max Titanium', 'Integralmedica', 'Dux', 'Atlhetica', 'Probiótica']

export const orderStatuses = [
  'pendente',
  'aprovado',
  'preparando',
  'recusado',
  'cancelado',
  'enviado',
  'entregue',
] as const

export const orderStatusLabels: Record<(typeof orderStatuses)[number], string> = {
  pendente: 'Pagamento pendente',
  aprovado: 'Pagamento aprovado - vendedor preparando seu pedido',
  preparando: 'Preparando envio',
  recusado: 'Pagamento recusado',
  cancelado: 'Cancelado',
  enviado: 'Enviado',
  entregue: 'Entregue',
}

export const fallbackProductImage =
  'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=900&q=80'

export const heroProducts = [
  {
    name: 'Whey Protein',
    image: 'https://images.unsplash.com/photo-1622484211148-4d0f2eb9d4ac?auto=format&fit=crop&w=520&q=90',
    heightClass: 'h-48 w-36 md:h-72 md:w-52',
  },
  {
    name: 'Creatina',
    image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=420&q=90',
    heightClass: 'h-40 w-28 md:h-60 md:w-40',
  },
  {
    name: 'Coqueteleira',
    image: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=340&q=90',
    heightClass: 'h-32 w-20 md:h-48 md:w-28',
  },
  {
    name: 'BCAA',
    image: 'https://images.unsplash.com/photo-1620230874645-0d8550b8b11e?auto=format&fit=crop&w=340&q=90',
    heightClass: 'h-36 w-24 md:h-52 md:w-32',
  },
]

export const promoCards = [
  {
    eyebrow: 'OFERTAS DA SEMANA',
    title: 'Economize com os melhores descontos!',
    action: 'APROVEITAR',
    image: 'https://images.unsplash.com/photo-1622484211148-4d0f2eb9d4ac?auto=format&fit=crop&w=420&q=90',
    tone: 'green',
  },
  {
    eyebrow: 'CHEGOU!',
    title: 'Novos pre-treinos para energia e foco',
    action: 'CONFERIR',
    image: 'https://images.unsplash.com/photo-1579722821273-0f6c1cda47f9?auto=format&fit=crop&w=420&q=90',
    tone: 'mint',
  },
  {
    eyebrow: 'COMBOS',
    title: 'Combinacoes perfeitas com precos especiais',
    action: 'VER COMBOS',
    image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=420&q=90',
    tone: 'dark',
  },
]

export const testimonials = [
  {
    name: 'Lucas Ferreira',
    text: 'Produtos de qualidade, entrega rapida e melhor preco do mercado. Confio demais!',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=90',
  },
  {
    name: 'Juliana Santos',
    text: 'Suplementos originais e atendimento nota 10. Virei cliente fiel!',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=90',
  },
  {
    name: 'Rafael Almeida',
    text: 'Site facil de usar, pagamento seguro e chegou tudo certinho. Recomendo!',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=90',
  },
]
