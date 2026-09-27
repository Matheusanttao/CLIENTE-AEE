import { supabase } from '../lib/supabase'

export async function subscribeNewsletter(email: string) {
  const normalized = email.trim().toLowerCase()
  if (!normalized) throw new Error('Informe um e-mail valido')

  const { error } = await supabase.from('newsletter_inscricoes').insert({ email: normalized })

  if (error) {
    if (error.code === '23505') throw new Error('Este e-mail ja esta cadastrado')
    throw error
  }
}
