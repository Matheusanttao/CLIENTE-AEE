import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { Button, EmptyState, Skeleton } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { getMyFavorites } from '../services/favorites'

export function FavoritesPage() {
  const { user } = useAuth()
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => getMyFavorites(user?.id ?? ''),
    enabled: Boolean(user),
  })

  return (
    <>
      <Helmet>
        <title>Favoritos - Passarin Suplementos</title>
      </Helmet>
      <div className="grid gap-6">
        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-black text-black">Meus favoritos</h1>
          <p className="mt-2 text-sm text-gray-500">Produtos que voce salvou para comprar depois.</p>
        </div>

        {isLoading && <Skeleton className="h-64" />}

        {!isLoading && favorites.length === 0 && (
          <EmptyState
            title="Nenhum favorito ainda"
            description="Clique no coracao nos produtos para salvar aqui."
          />
        )}

        {!isLoading && favorites.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <Link to="/catalogo">
          <Button variant="secondary">Ver catalogo</Button>
        </Link>
      </div>
    </>
  )
}
