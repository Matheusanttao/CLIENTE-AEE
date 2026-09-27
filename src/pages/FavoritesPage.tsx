import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CircleAlert, Heart } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import {
  CatalogEmptyState,
  CatalogLinkButton,
  CatalogProductGrid,
  CatalogProductSkeletons,
} from '../components/CatalogGrid'
import { ProductCard } from '../components/ProductCard'
import { Button } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { getMyFavorites } from '../services/favorites'

const gridColumns = 'md:grid-cols-3 xl:grid-cols-4'

export function FavoritesPage() {
  const { user } = useAuth()
  const { data: favorites = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => getMyFavorites(user?.id ?? ''),
    enabled: Boolean(user),
  })

  const hasFavorites = !isLoading && !isError && favorites.length > 0

  return (
    <>
      <Helmet>
        <title>{'Favoritos - A&E Total Mix'}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="grid gap-6 sm:gap-8">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Meus favoritos</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              {hasFavorites
                ? `${favorites.length} ${favorites.length === 1 ? 'produto salvo' : 'produtos salvos'} para comprar depois.`
                : 'Produtos que você salvou para comprar depois.'}
            </p>
          </div>
          {hasFavorites && (
            <Link
              to="/catalogo"
              className="group inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-brand transition hover:text-brand-hover"
            >
              Continuar comprando
              <ArrowRight size={16} className="transition group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          )}
        </header>

        {isLoading && (
          <CatalogProductGrid className={gridColumns}>
            <CatalogProductSkeletons count={4} />
          </CatalogProductGrid>
        )}

        {!isLoading && isError && (
          <CatalogEmptyState
            icon={CircleAlert}
            title="Não foi possível carregar seus favoritos"
            description="Verifique sua conexão e tente novamente em instantes."
          >
            <Button type="button" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </CatalogEmptyState>
        )}

        {!isLoading && !isError && favorites.length === 0 && (
          <CatalogEmptyState
            icon={Heart}
            title="Nenhum favorito ainda"
            description="Toque no coração dos produtos para salvá-los aqui e encontrá-los com facilidade depois."
          >
            <CatalogLinkButton to="/catalogo">Explorar o catálogo</CatalogLinkButton>
          </CatalogEmptyState>
        )}

        {hasFavorites && (
          <CatalogProductGrid className={gridColumns}>
            {favorites.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </CatalogProductGrid>
        )}
      </div>
    </>
  )
}
