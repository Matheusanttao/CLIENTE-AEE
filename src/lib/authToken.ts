import { supabase } from './supabase'

export async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  if (data.session?.access_token) return data.session.access_token

  const { data: refreshed } = await supabase.auth.refreshSession()
  return refreshed.session?.access_token ?? null
}

export async function authHeaders() {
  const token = await getAccessToken()
  if (!token) throw new Error('Sessao expirada. Faca login novamente no admin.')
  return { Authorization: `Bearer ${token}` }
}
