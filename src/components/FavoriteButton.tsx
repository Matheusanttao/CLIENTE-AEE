import type { MouseEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { addFavorite, getFavoriteProductIds, removeFavorite } from '../services/favorites'
import { cn } from '../utils/cn'
import { useToast } from './ui'

export function FavoriteButton({ productId, className }: { productId: string; className?: string }) {
  const { user } = useAuth()
  const { notify } = useToast()
  const queryClient = useQueryClient()

  const { data: favoriteIds = new Set<string>() } = useQuery({
    queryKey: ['favorite-ids', user?.id],
    queryFn: () => getFavoriteProductIds(user?.id ?? ''),
    enabled: Boolean(user),
  })

  const isFavorite = favoriteIds.has(productId)

  const toggle = async (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (!user) {
      notify('Faca login para salvar favoritos', 'error')
      return
    }

    try {
      if (isFavorite) {
        await removeFavorite(user.id, productId)
        notify('Removido dos favoritos')
      } else {
        await addFavorite(user.id, productId)
        notify('Adicionado aos favoritos')
      }
      await queryClient.invalidateQueries({ queryKey: ['favorite-ids', user.id] })
      await queryClient.invalidateQueries({ queryKey: ['favorites', user.id] })
    } catch {
      notify('Nao foi possivel atualizar favoritos', 'error')
    }
  }

  if (!user) {
    return (
      <Link
        to="/login"
        aria-label="Favoritos"
        className={cn('grid h-9 w-9 place-items-center rounded-full bg-white/90 text-black shadow-sm', className)}
      >
        <Heart size={18} />
      </Link>
    )
  }

  return (
    <button
      type="button"
      aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-sm transition',
        isFavorite ? 'text-red-500' : 'text-black hover:text-red-500',
        className,
      )}
      onClick={toggle}
    >
      <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
    </button>
  )
}
