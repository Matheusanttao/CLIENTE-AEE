import { supabase } from '../lib/supabase'
import { addressSchema, type AddressInput } from '../schemas'
import type { Address } from '../types'

const normalizeAddress = (input: AddressInput) => ({
  ...input,
  cep: input.cep.replace(/\D/g, ''),
  estado: input.estado.toUpperCase(),
})

export async function getMyAddresses(userId: string) {
  const { data, error } = await supabase
    .from('enderecos')
    .select('*')
    .eq('usuario_id', userId)
    .order('principal', { ascending: false })
    .order('criado_em', { ascending: false })

  if (error) throw error
  return (data ?? []) as Address[]
}

export async function getAddressById(addressId: string, userId: string) {
  const { data, error } = await supabase
    .from('enderecos')
    .select('*')
    .eq('id', addressId)
    .eq('usuario_id', userId)
    .single()

  if (error) throw error
  return data as Address
}

export async function createAddress(userId: string, input: AddressInput, options?: { principal?: boolean }) {
  const parsed = addressSchema.parse(normalizeAddress(input))
  const isFirst = (await getMyAddresses(userId)).length === 0

  const { data, error } = await supabase
    .from('enderecos')
    .insert({
      usuario_id: userId,
      ...parsed,
      principal: options?.principal ?? isFirst,
    })
    .select()
    .single()

  if (error) throw error

  if (options?.principal || isFirst) {
    await setPrimaryAddress(userId, data.id)
  }

  return data as Address
}

export async function updateAddress(addressId: string, userId: string, input: Partial<AddressInput>) {
  const payload = input.cep || input.estado ? normalizeAddress(input as AddressInput) : input

  const { data, error } = await supabase
    .from('enderecos')
    .update(payload)
    .eq('id', addressId)
    .eq('usuario_id', userId)
    .select()
    .single()

  if (error) throw error
  return data as Address
}

export async function deleteAddress(addressId: string, userId: string) {
  const { error } = await supabase.from('enderecos').delete().eq('id', addressId).eq('usuario_id', userId)
  if (error) throw error
}

export async function setPrimaryAddress(userId: string, addressId: string) {
  const { error: clearError } = await supabase
    .from('enderecos')
    .update({ principal: false })
    .eq('usuario_id', userId)

  if (clearError) throw clearError

  const { error } = await supabase
    .from('enderecos')
    .update({ principal: true })
    .eq('id', addressId)
    .eq('usuario_id', userId)

  if (error) throw error
}
