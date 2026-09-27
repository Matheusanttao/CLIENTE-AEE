import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin'

/**
 * Ping leve no Supabase para evitar pausa do projeto no plano gratuito.
 * Chamado automaticamente pelo Cron Job da Vercel (ver vercel.json).
 *
 * Exige CRON_SECRET. Na Vercel, defina CRON_SECRET no projeto — o cron
 * envia Authorization: Bearer <CRON_SECRET> automaticamente.
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    console.error('[cron/keep-alive] CRON_SECRET nao configurado')
    return response.status(503).json({ message: 'Service unavailable' })
  }

  const authHeader = request.headers.authorization
  if (authHeader !== `Bearer ${cronSecret}`) {
    return response.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const supabase = getSupabaseAdmin()
    const { count, error } = await supabase.from('produtos').select('id', { count: 'exact', head: true })

    if (error) throw error

    return response.status(200).json({
      ok: true,
      message: 'Supabase keep-alive executado',
      produtos: count ?? 0,
      at: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao consultar Supabase'
    console.error('[cron/keep-alive]', message)
    return response.status(500).json({ ok: false, message: 'Erro interno' })
  }
}
