import { z } from 'zod'
import { CORREIOS_MAX_WEIGHT_KG } from '../lib/constants'

export const loginSchema = z.object({
  email: z.string().email('Informe um e-mail valido'),
  password: z.string().min(6, 'A senha precisa ter no minimo 6 caracteres'),
})

export const registerSchema = loginSchema.extend({
  nome: z.string().min(3, 'Informe seu nome'),
  cpf: z.string().min(11, 'Informe seu CPF'),
  password: z.string().min(8, 'A senha precisa ter no minimo 8 caracteres'),
})

export const authPageSchema = z.object({
  email: z.string().email('Informe um e-mail valido'),
  password: z.string().optional(),
  nome: z.string().optional(),
  cpf: z.string().optional(),
})

export const addressSchema = z.object({
  nome_destinatario: z.string().min(3),
  cep: z.string().min(8),
  rua: z.string().min(3),
  numero: z.string().min(1),
  complemento: z.string().optional(),
  bairro: z.string().min(2),
  cidade: z.string().min(2),
  estado: z.string().length(2),
})

export const productSchema = z.object({
  nome: z.string().min(3),
  descricao: z.string().min(20),
  categoria: z.string().min(2, 'Informe a categoria'),
  marca: z.string().min(2),
  preco: z.coerce.number().positive(),
  preco_promocional: z.coerce.number().positive().optional(),
  estoque: z.coerce.number().int().nonnegative(),
  peso_kg: z.coerce
    .number()
    .positive('Informe o peso')
    .max(CORREIOS_MAX_WEIGHT_KG, `Peso maximo dos Correios: ${CORREIOS_MAX_WEIGHT_KG} kg`),
  altura_cm: z.coerce.number().positive(),
  largura_cm: z.coerce.number().positive(),
  comprimento_cm: z.coerce.number().positive(),
  destaque: z.boolean().default(false),
})

export const couponSchema = z.object({
  codigo: z.string().min(3),
})

export const checkoutSchema = z.object({
  endereco_id: z.string().uuid(),
  cupom_codigo: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type AuthPageInput = z.infer<typeof authPageSchema>
export type AddressInput = z.infer<typeof addressSchema>
export type ProductInput = z.infer<typeof productSchema>
