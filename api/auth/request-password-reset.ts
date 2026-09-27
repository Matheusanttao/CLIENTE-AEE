import { createHmac, randomInt } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sendPasswordResetCode } from '../_lib/orderEmails'
import { getClientIp, rateLimit } from '../_lib/rateLimit'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin'

const genericMessage = 'Se o e-mail estiver cadastrado, você receberá um código de recuperação.'

function codeHash(code: string, userId: string) {
  const secret = process.env.PASSWORD_RESET_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('PASSWORD_RESET_SECRET não configurado')
  return createHmac('sha256', secret).update(`${userId}:${code}`).digest('hex')
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  const email = String((request.body as { email?: string })?.email ?? '')
    .trim()
    .toLowerCase()
  if (!email || !email.includes('@')) return response.status(200).json({ message: genericMessage })

  const limitKey = `password-reset:${getClientIp(request)}:${email}`
  if (!rateLimit(limitKey, 5, 60 * 60_000)) {
    return response.status(429).json({ message: 'Muitas tentativas. Aguarde antes de solicitar outro código.' })
  }

  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase
    .from('usuarios')
    .select('id, nome, email')
    .ilike('email', email)
    .maybeSingle()
  if (!user) return response.status(200).json({ message: genericMessage })

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString()
  await supabase
    .from('password_reset_codes')
    .delete()
    .eq('usuario_id', user.id)
    .is('usado_em', null)

  const { data: reset, error } = await supabase
    .from('password_reset_codes')
    .insert({
      usuario_id: user.id,
      email: user.email,
      codigo_hash: codeHash(code, user.id),
      expira_em: expiresAt,
    })
    .select('id')
    .single()
  if (error || !reset) {
    console.error('[password-reset] erro ao registrar código:', error?.message)
    return response.status(200).json({ message: genericMessage })
  }

  try {
    await sendPasswordResetCode(user.email, code, user.nome)
  } catch (sendError) {
    await supabase.from('password_reset_codes').delete().eq('id', reset.id)
    console.error('[password-reset] erro no e-mail:', sendError)
  }

  return response.status(200).json({ message: genericMessage })
}
