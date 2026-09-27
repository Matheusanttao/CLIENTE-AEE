export type ProductCategory = string

export type OrderStatus =
  | 'pendente'
  | 'aprovado'
  | 'preparando'
  | 'recusado'
  | 'cancelado'
  | 'enviado'
  | 'entregue'

export type UserRole = 'cliente' | 'admin'

export interface ProductImage {
  id: string
  produto_id: string
  url: string
  alt: string | null
  ordem: number
}

export interface ProductFlavor {
  id: string
  produto_id: string
  nome: string
  estoque: number
  ativo: boolean
}

export interface Product {
  id: string
  nome: string
  slug: string
  descricao: string
  categoria: ProductCategory
  marca: string
  preco: number
  preco_promocional: number | null
  estoque: number
  peso_kg: number
  altura_cm: number
  largura_cm: number
  comprimento_cm: number
  destaque: boolean
  ativo?: boolean
  avaliacao_media: number
  total_avaliacoes: number
  criado_em: string
  imagens_produtos?: ProductImage[]
  produto_sabores?: ProductFlavor[]
}

export interface CartItem {
  product: Product
  quantity: number
  flavor?: ProductFlavor | null
}

export interface ShippingOption {
  id: string
  service: string
  carrier: string
  price: number
  deliveryTime: number
  cep: string
}

export interface Address {
  id: string
  usuario_id: string
  nome_destinatario: string
  cep: string
  rua: string
  numero: string
  complemento: string | null
  bairro: string
  cidade: string
  estado: string
  principal: boolean
}

export interface Order {
  id: string
  usuario_id: string
  endereco_id: string | null
  endereco_snapshot?: Record<string, string | null> | null
  status: OrderStatus
  subtotal: number
  desconto: number
  desconto_pix?: number
  frete: number
  frete_servico: string | null
  frete_transportadora: string | null
  frete_prazo_dias: number | null
  frete_cep: string | null
  frete_service_id?: string | null
  total: number
  cupom_codigo: string | null
  metodo_pagamento?: 'pix' | 'cartao' | null
  mp_preference_id: string | null
  mp_payment_id: string | null
  superfrete_cart_id?: string | null
  superfrete_status?: string | null
  codigo_rastreio?: string | null
  url_rastreio?: string | null
  etiqueta_gerada_em?: string | null
  postado_em?: string | null
  entregue_em?: string | null
  criado_em: string
  enderecos?: Address | null
  itens_pedido?: Array<{
    quantidade: number
    preco_unitario: number
    sabor_nome?: string | null
    produtos?: {
      nome: string
      slug?: string
      imagens_produtos?: ProductImage[]
    } | null
  }>
}

export interface Review {
  id: string
  usuario_id?: string
  produto_id: string
  nota: number
  comentario: string | null
  aprovado: boolean
  criado_em: string
  usuarios?: { nome: string } | null
}

export interface Customer {
  id: string
  nome: string
  email: string
  role: UserRole
  criado_em: string
}

export interface Coupon {
  codigo: string
  tipo: 'percentual' | 'fixo'
  valor: number
  ativo: boolean
  valor_minimo: number
}

export interface CatalogFilters {
  search?: string
  categoria?: string
  marca?: string
  min?: number
  max?: number
  sort?: string
  page?: number
}
