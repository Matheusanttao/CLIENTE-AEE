import type { OrderStatus, ProductCategory, UserRole } from './index'

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          nome: string
          email: string
          telefone: string | null
          cpf: string | null
          role: UserRole
          criado_em: string
        }
      }
      produtos: {
        Row: {
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
          ativo: boolean
          avaliacao_media: number
          total_avaliacoes: number
          criado_em: string
        }
      }
      pedidos: {
        Row: {
          id: string
          usuario_id: string
          status: OrderStatus
          subtotal: number
          desconto: number
          frete: number
          frete_servico: string | null
          frete_transportadora: string | null
          frete_prazo_dias: number | null
          frete_cep: string | null
          total: number
          cupom_codigo: string | null
          mp_preference_id: string | null
          mp_payment_id: string | null
          criado_em: string
        }
      }
    }
  }
}
