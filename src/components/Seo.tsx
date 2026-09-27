import { Helmet } from 'react-helmet-async'
import {
  absoluteAssetUrl,
  absoluteUrl,
  DEFAULT_KEYWORDS,
  SITE_LOCALITY,
  SITE_NAME,
} from '../lib/seo'

type SeoProps = {
  title: string
  description: string
  path?: string
  image?: string | null
  type?: 'website' | 'product' | 'article'
  keywords?: string
  noindex?: boolean
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>
}

export function Seo({
  title,
  description,
  path = '/',
  image,
  type = 'website',
  keywords = DEFAULT_KEYWORDS,
  noindex = false,
  jsonLd,
}: SeoProps) {
  const url = absoluteUrl(path)
  const ogImage = absoluteAssetUrl(image)
  const robots = noindex ? 'noindex, nofollow' : 'index, follow'
  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []

  return (
    <Helmet>
      <html lang="pt-BR" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />
      <meta name="author" content={SITE_NAME} />
      <meta name="geo.region" content="BR-MG" />
      <meta name="geo.placename" content={SITE_LOCALITY} />
      <meta name="language" content="pt-BR" />
      <link rel="canonical" href={url} />

      <meta property="og:type" content={type === 'product' ? 'product' : 'website'} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={title} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  )
}
