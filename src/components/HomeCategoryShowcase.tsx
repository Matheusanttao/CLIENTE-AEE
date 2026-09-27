import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { optimizeCloudinaryUrl } from '../lib/cloudinary'
import type { SiteCategory } from '../types/settings'
import { cn } from '../utils/cn'
import { SectionHeader } from './ui'

const desktopColumns = (count: number) =>
  count <= 4 ? 'lg:grid-cols-4' : count === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-6'

/** Vitrine de categorias cadastradas em Configurações que possuem produtos. */
export function HomeCategoryShowcase({ categories }: { categories: SiteCategory[] }) {
  if (categories.length === 0) return null

  // No celular: rolagem lateral quando ha mais de 2 categorias; grade a partir do sm.
  const scrolls = categories.length > 2

  return (
    <section className="container pt-12 md:pt-16">
      <SectionHeader title="Compre por categoria" action={{ label: 'Ver tudo', to: '/catalogo' }} />

      <ul
        className={cn(
          'mt-6 sm:grid sm:grid-cols-3 sm:gap-5 md:grid-cols-4',
          desktopColumns(categories.length),
          scrolls
            ? 'no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0'
            : 'grid grid-cols-2 gap-3',
        )}
      >
        {categories.map((category) => (
          <li key={category.name} className={cn('min-w-0', scrolls && 'w-[42%] shrink-0 snap-start sm:w-auto')}>
            <Link
              to={`/catalogo?categoria=${encodeURIComponent(category.name)}`}
              className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sand-soft">
                <img
                  src={optimizeCloudinaryUrl(category.image, 600)}
                  alt={category.label}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 px-0.5">
                <h3 className="truncate text-sm font-semibold text-ink transition-colors group-hover:text-brand sm:text-[15px]">
                  {category.label}
                </h3>
                <ArrowRight
                  size={16}
                  aria-hidden
                  className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand"
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
