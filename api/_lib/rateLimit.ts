import type { VercelRequest } from '@vercel/node'

interface Bucket {
  count: number
  resetAt: number
}

// Rate limit best-effort em memoria. Observacao: em ambiente serverless o estado
// vive por instancia (reseta em cold start / escala horizontal), entao serve como
// uma primeira barreira contra abuso. Para producao com alto trafego, troque por
// um store compartilhado (ex: Upstash Redis).
const buckets = new Map<string, Bucket>()

export function getClientIp(request: VercelRequest): string {
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded.split(',')[0].trim()
  if (Array.isArray(forwarded) && forwarded.length > 0) return forwarded[0]
  return request.socket?.remoteAddress ?? 'unknown'
}

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (bucket.count >= limit) return false

  bucket.count += 1
  return true
}
