import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuthUser } from '../_lib/auth'
import { sendWelcomeEmail } from '../_lib/orderEmails'
import { getClientIp, rateLimit } from '../_lib/rateLimit'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const authenticatedUser = await getAuthUser(request)
    let userId = authenticatedUser?.id

    if (!userId) {
      const body = (request.body ?? {}) as { userId?: string; email?: string }
      const requestedId = String(body.userId ?? '').trim()
      const email = String(body.email ?? '').trim().toLowerCase()
      if (
        !/^[0-9a-f-]{36}$/i.test(requestedId) ||
        !email.includes('@') ||
        !rateLimit(`welcome:${getClientIp(request)}`, 5, 60 * 60_000)
      ) {
        return response.status(401).json({ message: 'UNAUTHORIZED' })
      }

      const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString()
      const { data: recentUser } = await getSupabaseAdmin()
        .from('usuarios')
        .select('id')
        .eq('id', requestedId)
        .ilike('email', email)
        .gte('criado_em', tenMinutesAgo)
        .maybeSingle()
      userId = recentUser?.id
    }

    if (!userId) return response.status(401).json({ message: 'UNAUTHORIZED' })

    const result = await sendWelcomeEmail(userId)
    if (!result.ok) {
      console.error('[welcome-email]', result.message)
      return response.status(500).json({ message: 'Não foi possível enviar as boas-vindas.' })
    }
    return response.status(200).json({ ok: true, skipped: result.skipped ?? false })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNAUTHORIZED'
    return response.status(message === 'UNAUTHORIZED' ? 401 : 500).json({ message })
  }
}
