import { createHash } from 'crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Assinatura Cloudinary para upload de imagens (admin).
 * Auth via REST do Supabase (sem @supabase/supabase-js) para estabilidade na Vercel.
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    if (request.method !== 'GET') {
      return response.status(405).json({ message: 'Method not allowed' })
    }

    const authError = await assertAdmin(request)
    if (authError) {
      return response.status(authError.status).json({ message: authError.message })
    }

    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME
    const folder = 'fitstore/products'

    if (!apiKey || !apiSecret || !cloudName) {
      return response.status(500).json({
        message:
          'Cloudinary nao configurado. Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET e reinicie o servidor.',
      })
    }

    const timestamp = Math.round(Date.now() / 1000)
    const payload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`
    const signature = createHash('sha1').update(payload).digest('hex')

    return response.status(200).json({
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
    })
  } catch (error) {
    console.error('[cloudinary/sign]', error)
    return response.status(500).json({
      message: error instanceof Error ? error.message : 'Erro interno ao assinar upload',
    })
  }
}

function readHeader(request: VercelRequest, name: string) {
  const raw = request.headers[name] ?? request.headers[name.toLowerCase()]
  if (Array.isArray(raw)) return raw[0]
  return typeof raw === 'string' ? raw : undefined
}

async function fetchAuthUser(supabaseUrl: string, token: string, apikey: string) {
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey,
    },
  })

  if (!userResponse.ok) {
    const body = await userResponse.text()
    return { ok: false as const, status: userResponse.status, body }
  }

  const user = (await userResponse.json()) as { id?: string }
  if (!user.id) return { ok: false as const, status: 401, body: 'missing user id' }
  return { ok: true as const, userId: user.id }
}

async function assertAdmin(
  request: VercelRequest,
): Promise<{ status: number; message: string } | null> {
  const authHeader = readHeader(request, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      status: 401,
      message: 'Nao autorizado. Faca login no admin e tente o upload pelo painel (nao abra /api/cloudinary/sign no navegador).',
    }
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    return { status: 401, message: 'Sessao invalida. Faca login novamente no admin.' }
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  const publicKey =
    process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl) {
    return { status: 500, message: 'VITE_SUPABASE_URL ausente no .env / Vercel.' }
  }

  if (!serviceKey && !publicKey) {
    return {
      status: 500,
      message: 'Faltam chaves Supabase no servidor (SERVICE_ROLE ou PUBLISHABLE/ANON).',
    }
  }

  // Tenta primeiro a chave publica (fluxo normal do Auth), depois service role
  const keyCandidates = [publicKey, serviceKey].filter(Boolean) as string[]
  let userId: string | null = null
  let lastAuthStatus = 401
  let lastAuthBody = ''

  for (const apikey of keyCandidates) {
    const result = await fetchAuthUser(supabaseUrl, token, apikey)
    if (result.ok) {
      userId = result.userId
      break
    }
    lastAuthStatus = result.status
    lastAuthBody = result.body
  }

  if (!userId) {
    console.error('[cloudinary/sign] auth/v1/user failed', lastAuthStatus, lastAuthBody)
    return {
      status: 401,
      message: 'Sessao invalida ou expirada. Saia e entre de novo no admin.',
    }
  }

  if (!serviceKey) {
    return {
      status: 500,
      message: 'SUPABASE_SERVICE_ROLE_KEY ausente no .env / Vercel (precisa para checar role admin).',
    }
  }

  const roleUrl = new URL(`${supabaseUrl}/rest/v1/usuarios`)
  roleUrl.searchParams.set('select', 'role')
  roleUrl.searchParams.set('id', `eq.${userId}`)

  const roleResponse = await fetch(roleUrl, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json',
    },
  })

  if (!roleResponse.ok) {
    const detail = await roleResponse.text()
    console.error('[cloudinary/sign] role lookup failed', roleResponse.status, detail)
    return { status: 500, message: 'Falha ao verificar perfil admin no Supabase.' }
  }

  const rows = (await roleResponse.json()) as Array<{ role?: string }>
  if (rows[0]?.role !== 'admin') {
    return {
      status: 403,
      message: 'Acesso negado. Seu usuario nao tem role admin na tabela usuarios.',
    }
  }

  return null
}
