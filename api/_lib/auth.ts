import { createClient } from '@supabase/supabase-js'
import type { VercelRequest } from '@vercel/node'
import { getSupabaseAdmin } from './supabaseAdmin'

function getBearerToken(request: VercelRequest) {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  return token || null
}

export async function getAuthUser(request: VercelRequest) {
  const token = getBearerToken(request)
  if (!token) return null

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  if (!supabaseUrl) return null

  // 1) Service role (preferencial no servidor)
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.auth.getUser(token)
    if (!error && data.user) return data.user
  } catch (error) {
    console.error('[auth] service role getUser failed', error)
  }

  // 2) Fallback com chave publica (anon / publishable)
  const publicKey =
    process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!publicKey) return null

  try {
    const client = createClient(supabaseUrl, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await client.auth.getUser(token)
    if (error || !data.user) return null
    return data.user
  } catch (error) {
    console.error('[auth] public key getUser failed', error)
    return null
  }
}

export async function requireAuthUser(request: VercelRequest) {
  const user = await getAuthUser(request)
  if (!user) throw new Error('UNAUTHORIZED')
  return user
}

export async function requireAdminUser(request: VercelRequest) {
  const user = await requireAuthUser(request)

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.from('usuarios').select('role').eq('id', user.id).single()
    if (error || data?.role !== 'admin') throw new Error('FORBIDDEN')
    return user
  } catch (error) {
    if (error instanceof Error && (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED')) {
      throw error
    }
    console.error('[auth] requireAdminUser failed', error)
    throw error instanceof Error ? error : new Error('UNAUTHORIZED')
  }
}
