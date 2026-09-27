import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { brandImages, brandPhoto, type BrandPhoto } from '../lib/brandImages'
import { optimizeCloudinaryUrl } from '../lib/cloudinary'
import type { SiteCategory } from '../types/settings'
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
        <div className="grid overflow-hidden rounded-2xl bg-sand sm:rounded-3xl md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="order-2 flex flex-col justify-center px-5 pb-7 pt-6 sm:p-8 md:order-1 md:py-10 lg:px-12 xl:px-10">
            {settings.hero_eyebrow && (
              <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
                {settings.hero_eyebrow}
              </p>
            )}

            <h1 className="mt-4 text-balance text-[2rem] font-bold leading-[1.1] tracking-tight text-ink sm:text-[2.75rem] md:text-[2.5rem] lg:text-5xl xl:text-[2.75rem]">
              {settings.hero_title}
              {settings.hero_title_highlight && <span className="block text-brand">{settings.hero_title_highlight}</span>}
            </h1>

            {settings.hero_subtitle && (
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink/70 sm:text-base">
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
              className="absolute inset-0 h-full w-full object-cover"
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

function HeroTile({ collection, to }: { collection: HomeCollection; to: string }) {
  const { photo, alt } = tilePhotos[collection.key]

  return (
    <Link
      to={to}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl bg-sand-soft transition-colors duration-200 hover:bg-sand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 sm:flex-row"
    >
      <div className="relative w-full shrink-0 overflow-hidden bg-sand sm:w-[40%] xl:w-[44%]">
        <div className="aspect-[4/5]" aria-hidden />
        <img
          src={brandPhoto(photo, 400, 500)}
          srcSet={`${brandPhoto(photo, 400, 500)} 400w, ${brandPhoto(photo, 800, 1000)} 800w`}
          sizes="(min-width: 1280px) 180px, (min-width: 640px) 20vw, 46vw"
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center p-3.5 sm:p-5 xl:p-6">
        <p className="text-base font-semibold tracking-tight text-ink sm:text-lg lg:text-xl">{collection.label}</p>
        <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand sm:mt-2">
          Ver coleção
          <ArrowRight size={15} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}
