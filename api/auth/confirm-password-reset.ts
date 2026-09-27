import { createHmac, timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientIp, rateLimit } from '../_lib/rateLimit'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin'

function codeHash(code: string, userId: string) {
  const secret = process.env.PASSWORD_RESET_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('PASSWORD_RESET_SECRET não configurado')
  return createHmac('sha256', secret).update(`${userId}:${code}`).digest('hex')
}

function matchesHash(received: string, expected: string) {
  const left = Buffer.from(received, 'hex')
  const right = Buffer.from(expected, 'hex')
  return left.length === right.length && timingSafeEqual(left, right)
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  const body = (request.body ?? {}) as { email?: string; code?: string; password?: string }
  const email = String(body.email ?? '').trim().toLowerCase()
  const code = String(body.code ?? '').replace(/\D/g, '')
  const password = String(body.password ?? '')

  if (!email || !/^\d{6}$/.test(code)) {
    return response.status(400).json({ message: 'Informe o e-mail e o código de 6 dígitos.' })
  }
  if (password.length < 8) {
    return response.status(400).json({ message: 'A nova senha precisa ter pelo menos 8 caracteres.' })
  }
  if (!rateLimit(`password-reset-confirm:${getClientIp(request)}:${email}`, 10, 60 * 60_000)) {
    return response.status(429).json({ message: 'Muitas tentativas. Solicite um novo código.' })
  }

  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase.from('usuarios').select('id').ilike('email', email).maybeSingle()
  if (!user) return response.status(400).json({ message: 'Código inválido ou expirado.' })

  const { data: reset } = await supabase
    .from('password_reset_codes')
    .select('id, codigo_hash, tentativas')
    .eq('usuario_id', user.id)
    .is('usado_em', null)
    .gt('expira_em', new Date().toISOString())
    .lt('tentativas', 5)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!reset) return response.status(400).json({ message: 'Código inválido ou expirado.' })

  const attempts = Number(reset.tentativas) + 1
  await supabase.from('password_reset_codes').update({ tentativas: attempts }).eq('id', reset.id)

  if (!matchesHash(codeHash(code, user.id), reset.codigo_hash)) {
    return response.status(400).json({ message: 'Código inválido ou expirado.' })
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, { password })
  if (error) {
    console.error('[password-reset] erro ao atualizar senha:', error.message)
    return response.status(500).json({ message: 'Não foi possível atualizar a senha.' })
  }

  await supabase
    .from('password_reset_codes')
    .update({ usado_em: new Date().toISOString() })
    .eq('id', reset.id)

  return response.status(200).json({ ok: true, message: 'Senha atualizada com sucesso.' })
}
