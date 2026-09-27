import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from './supabaseAdmin'

const SITE_URL = (process.env.APP_URL ?? process.env.SITE_URL ?? 'https://passarinsuplementos.com.br').replace(
  /\/$/,
  '',
)

type SitemapEntry = {
  loc: string
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly'
  priority: string
  lastmod?: string
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toLastmod(isoDate: string | null | undefined) {
  if (!isoDate) return undefined
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString().slice(0, 10)
}

function buildXml(entries: SitemapEntry[]) {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : ''
      return `  <url>
    <loc>${escapeXml(entry.loc)}</loc>${lastmod}
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  const staticEntries: SitemapEntry[] = [
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_URL}/catalogo`, changefreq: 'daily', priority: '0.9' },
    { loc: `${SITE_URL}/rastrear-pedido`, changefreq: 'monthly', priority: '0.5' },
    { loc: `${SITE_URL}/privacidade`, changefreq: 'yearly', priority: '0.3' },
    { loc: `${SITE_URL}/termos`, changefreq: 'yearly', priority: '0.3' },
    { loc: `${SITE_URL}/trocas-devolucoes`, changefreq: 'yearly', priority: '0.3' },
  ]

  try {
    const supabase = getSupabaseAdmin()

    // Pagina produtos ativos; se a coluna ativo falhar, tenta sem filtro.
    let products: { slug: string; categoria: string | null; criado_em: string | null }[] = []

    const activeQuery = await supabase
      .from('produtos')
      .select('slug, categoria, criado_em')
      .eq('ativo', true)
      .order('criado_em', { ascending: false })

    if (activeQuery.error) {
      const fallback = await supabase
        .from('produtos')
        .select('slug, categoria, criado_em')
        .order('criado_em', { ascending: false })
      if (fallback.error) throw fallback.error
      products = fallback.data ?? []
    } else {
      products = activeQuery.data ?? []
    }

    const categories = [
      ...new Set(
        products
          .map((product) => product.categoria?.trim())
          .filter((categoria): categoria is string => Boolean(categoria)),
      ),
    ]

    const categoryEntries: SitemapEntry[] = categories.map((categoria) => ({
      loc: `${SITE_URL}/catalogo?categoria=${encodeURIComponent(categoria)}`,
      changefreq: 'weekly',
      priority: '0.8',
    }))

    const productEntries: SitemapEntry[] = products
      .filter((product) => Boolean(product.slug?.trim()))
      .map((product) => ({
        loc: `${SITE_URL}/produto/${product.slug.trim()}`,
        changefreq: 'weekly' as const,
        priority: '0.8',
        lastmod: toLastmod(product.criado_em),
      }))

    const xml = buildXml([...staticEntries, ...categoryEntries, ...productEntries])

    response.setHeader('Content-Type', 'application/xml; charset=utf-8')
    response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return response.status(200).send(xml)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao gerar sitemap'
    console.error('[sitemap]', message)

    // Fallback minimo para o Google nao ficar sem sitemap se o DB falhar.
    const xml = buildXml(staticEntries)
    response.setHeader('Content-Type', 'application/xml; charset=utf-8')
    response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
    return response.status(200).send(xml)
  }
}
