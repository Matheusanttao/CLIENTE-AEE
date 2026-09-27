import type { MouseEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { addFavorite, getFavoriteProductIds, removeFavorite } from '../services/favorites'
import { cn } from '../utils/cn'
import { useToast } from './ui'

const baseClass =
  'relative grid shrink-0 place-items-center rounded-full border bg-white transition-colors duration-200 ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 ' +
  // Area de toque um pouco maior que o circulo visivel
  "after:absolute after:-inset-1 after:content-['']"

export function FavoriteButton({
  productId,
  className,
  size = 'sm',
}: {
  productId: string
  className?: string
  /** sm = 36px (cards) | md = 44px (pagina do produto) */
  size?: 'sm' | 'md'
}) {
  const { user } = useAuth()
  const { notify } = useToast()
  const queryClient = useQueryClient()

  const { data: favoriteIds = new Set<string>() } = useQuery({
    queryKey: ['favorite-ids', user?.id],
    queryFn: () => getFavoriteProductIds(user?.id ?? ''),
    enabled: Boolean(user),
  })

  const isFavorite = favoriteIds.has(productId)
  const sizeClass = size === 'md' ? 'h-11 w-11' : 'h-9 w-9'
  const iconSize = size === 'md' ? 20 : 17

  const toggle = async (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (!user) {
      notify('Faça login para salvar favoritos', 'error')
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
      notify('Não foi possível atualizar favoritos', 'error')
    }
  }

  if (!user) {
    return (
      <Link
        to="/login"
        aria-label="Entrar para salvar nos favoritos"
        title="Salvar nos favoritos"
        className={cn(baseClass, sizeClass, 'border-line text-ink hover:border-[#D0D5DD] hover:text-brand', className)}
      >
        <Heart size={iconSize} strokeWidth={1.8} aria-hidden />
      </Link>
    )
  }

  return (
    <button
      type="button"
      aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      aria-pressed={isFavorite}
      title={isFavorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
      className={cn(
        baseClass,
        sizeClass,
        isFavorite
          ? 'border-brand-soft text-brand hover:border-brand'
          : 'border-line text-ink hover:border-[#D0D5DD] hover:text-brand',
        className,
      )}
      onClick={toggle}
    >
      <Heart size={iconSize} strokeWidth={1.8} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden />
    </button>
  )
}
