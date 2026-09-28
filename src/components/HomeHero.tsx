import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { brandImages, brandPhoto, type BrandPhoto } from '../lib/brandImages'
import { optimizeCloudinaryUrl } from '../lib/cloudinary'
import type { SiteCategory } from '../types/settings'
import { cn } from '../utils/cn'
import { HomeCta } from './HomeCta'
import { homeCollectionPath, homeCollections, type HomeCollection } from './homeCollections'

const tilePhotos: Record<HomeCollection['key'], { photo: BrandPhoto; alt: string }> = {
  sneakers: { photo: 'sneakerRed', alt: 'Tênis cano baixo vermelho e branco' },
  perfumes: { photo: 'perfumeAmber', alt: 'Frasco de perfume âmbar sobre fundo bege' },
}

/** Banner principal: chamada da loja + dois atalhos fixos (Tênis e Perfumes). */
export function HomeHero({ categories }: { categories: SiteCategory[] }) {
  const { settings } = useSiteSettings()
  const heroImage = settings.hero_image_url?.trim() || brandImages.heroSneaker
  const isDefaultImage = heroImage === brandImages.heroSneaker

  return (
    <section className="container mt-4 sm:mt-6" aria-label="Destaques da loja">
      <div className="grid gap-3 sm:gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid overflow-hidden rounded-2xl bg-gradient-to-br from-sand-soft via-sand to-sand shadow-card sm:rounded-3xl md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="order-2 flex flex-col justify-center px-5 pb-7 pt-6 sm:p-8 md:order-1 md:py-10 lg:px-12 xl:px-10">
            {settings.hero_eyebrow && (
              <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-ink shadow-sm">
                <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
                {settings.hero_eyebrow}
              </p>
            )}

            <h1 className="mt-4 text-balance text-[2rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[2.75rem] md:text-[2.5rem] lg:text-5xl xl:text-[2.75rem]">
              {settings.hero_title}
              {settings.hero_title_highlight && <span className="block text-brand">{settings.hero_title_highlight}</span>}
            </h1>

            {settings.hero_subtitle && (
              <p className="mt-4 max-w-md text-[15px] font-medium leading-relaxed text-ink-soft sm:text-base">
                {settings.hero_subtitle}
              </p>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <HomeCta to="/catalogo" size="lg">
                {settings.hero_cta_label || 'Ver produtos'}
              </HomeCta>
              <HomeCta href="#atacado" variant="secondary" size="lg">
                Comprar no atacado
              </HomeCta>
            </div>
          </div>

          <div className="relative order-1 aspect-[4/3] bg-sand sm:aspect-[16/9] md:order-2 md:aspect-auto md:min-h-[400px] lg:min-h-[440px] xl:min-h-0">
            <img
              src={isDefaultImage ? heroImage : optimizeCloudinaryUrl(heroImage, 1400)}
              srcSet={
                isDefaultImage
                  ? `${brandPhoto('sneakerBeige', 700)} 700w, ${brandPhoto('sneakerBeige', 1000)} 1000w, ${heroImage} 1400w`
                  : undefined
              }
              sizes={isDefaultImage ? '(min-width: 1280px) 400px, (min-width: 768px) 48vw, 100vw' : undefined}
              alt={isDefaultImage ? 'Tênis branco sobre tecido bege' : settings.hero_title || settings.store_name}
              fetchPriority="high"
              // Imagem enviada pela loja costuma ter texto/logo embutido: `contain` evita cortar.
              className={cn('absolute inset-0 h-full w-full', isDefaultImage ? 'object-cover' : 'object-contain')}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-1 xl:grid-rows-2">
          {homeCollections.map((collection) => (
            <HeroTile key={collection.key} collection={collection} to={homeCollectionPath(collection, categories)} />
          ))}
        </div>
      </div>
    </section>
  )
}

/** Card de colecao: foto sangrando no card inteiro, com degrade escuro e rotulo sobreposto. */
function HeroTile({ collection, to }: { collection: HomeCollection; to: string }) {
  const { photo, alt } = tilePhotos[collection.key]

  return (
    <Link
      to={to}
      className="group relative flex aspect-[4/5] min-w-0 items-end overflow-hidden rounded-2xl bg-sand shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 sm:aspect-[16/10] sm:rounded-3xl xl:aspect-auto xl:h-full"
    >
      <img
        src={brandPhoto(photo, 800, 800)}
        srcSet={`${brandPhoto(photo, 500, 500)} 500w, ${brandPhoto(photo, 1000, 1000)} 1000w`}
        sizes="(min-width: 1280px) 420px, (min-width: 640px) 48vw, 46vw"
        alt={alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
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
