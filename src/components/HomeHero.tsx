import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { brandImages, storeImages } from '../lib/brandImages'
import { optimizeCloudinaryUrl } from '../lib/cloudinary'
import type { SiteCategory } from '../types/settings'
import { cn } from '../utils/cn'
import { HomeCta } from './HomeCta'
import { homeCollectionPath, homeCollections, type HomeCollection } from './homeCollections'

const tilePhotos: Record<HomeCollection['key'], { src: string; alt: string }> = {
  sneakers: { src: storeImages.collectionSneakers, alt: 'Tênis branco e preto sobre base de pedra clara' },
  perfumes: { src: storeImages.collectionPerfumes, alt: 'Três frascos de perfume sobre base de pedra clara' },
}

/** Banner principal: imagem em largura total, chamada da loja abaixo e atalhos de colecao. */
export function HomeHero({ categories }: { categories: SiteCategory[] }) {
  const { settings } = useSiteSettings()
  const heroImage = settings.hero_image_url?.trim() || brandImages.heroBanner
  const isDefaultImage = heroImage === brandImages.heroBanner

  return (
    <section aria-label="Destaques da loja">
      <div className="relative isolate w-full overflow-hidden bg-sand">
        <img
          src={isDefaultImage ? heroImage : optimizeCloudinaryUrl(heroImage, 1920)}
          alt={isDefaultImage ? 'Tênis e perfumes em cenário bege' : settings.hero_title || settings.store_name}
          fetchPriority="high"
          decoding="async"
          // A arte padrao deixa a metade esquerda vazia: deslocar o enquadramento mantem os produtos visiveis.
          className={cn('absolute inset-0 -z-10 h-full w-full object-cover', isDefaultImage && 'object-[72%_center]')}
        />

        {/* Veu claro para o texto escuro continuar legivel sobre a foto. */}
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-b from-white/95 via-white/80 to-white/40 sm:bg-gradient-to-r sm:from-white/95 sm:via-white/75 sm:to-transparent"
          aria-hidden
        />

        <div className="container flex min-h-[420px] flex-col justify-center py-12 sm:min-h-[440px] sm:py-14 lg:min-h-[520px] lg:py-16">
          <div className="max-w-xl">
            {settings.hero_eyebrow && (
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-ink shadow-sm">
                <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
                {settings.hero_eyebrow}
              </p>
            )}

            <h1 className="mt-5 text-balance text-[2.125rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[2.75rem] lg:text-[3.25rem]">
              {settings.hero_title}
              {settings.hero_title_highlight && (
                <span className="block text-brand">{settings.hero_title_highlight}</span>
              )}
            </h1>

            {settings.hero_subtitle && (
              <p className="mt-4 max-w-md text-[15px] font-medium leading-relaxed text-ink-soft sm:text-base">
                {settings.hero_subtitle}
              </p>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <HomeCta to="/catalogo" size="lg">
                {settings.hero_cta_label || 'Ver produtos'}
              </HomeCta>
              <HomeCta href="#atacado" variant="secondary" size="lg">
                Comprar no atacado
              </HomeCta>
            </div>
          </div>
        </div>
      </div>

      <div className="container mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4">
        {homeCollections.map((collection) => (
          <HeroTile key={collection.key} collection={collection} to={homeCollectionPath(collection, categories)} />
        ))}
      </div>
    </section>
  )
}

/** Card de colecao: foto sangrando no card inteiro, com degrade escuro e rotulo sobreposto. */
function HeroTile({ collection, to }: { collection: HomeCollection; to: string }) {
  const { src, alt } = tilePhotos[collection.key]

  return (
    <Link
      to={to}
      className="group relative flex aspect-[4/5] min-w-0 items-end overflow-hidden rounded-2xl bg-sand shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 sm:aspect-[16/9] sm:rounded-3xl"
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-[center_62%] transition duration-500 ease-out group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" aria-hidden />

      <div className="relative w-full p-4 sm:p-5 xl:p-6">
        <p className="text-lg font-extrabold leading-tight tracking-tight text-white sm:text-xl xl:text-2xl">
          {collection.label}
        </p>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm transition-colors group-hover:bg-brand sm:text-sm">
          Ver coleção
          <ArrowRight size={15} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}
