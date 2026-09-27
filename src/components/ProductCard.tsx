import { ShoppingBag, Star } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { FavoriteButton } from './FavoriteButton'
import { useToast } from './ui'
import { useCart } from '../contexts/CartContext'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { fallbackProductImage } from '../lib/constants'
import { optimizeCloudinaryUrl } from '../lib/cloudinary'
import { isStoreDemoMode } from '../lib/storeMode'
import { productRequiresFlavor } from '../services/flavors'
import { calculatePixDiscount } from '../services/orders'
import type { Product } from '../types'
import { cn } from '../utils/cn'
import { formatCurrency } from '../utils/format'

export function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { notify } = useToast()
  const { settings } = useSiteSettings()

  const cover =
    [...(product.imagens_produtos ?? [])].sort((a, b) => a.ordem - b.ordem)[0]?.url ?? fallbackProductImage
  const image = optimizeCloudinaryUrl(cover, 600)
  const productUrl = `/produto/${product.slug}`

  const salePrice = product.preco_promocional
  const currentPrice = salePrice ?? product.preco
  const onSale = salePrice != null && salePrice < product.preco
  const discount = onSale && product.preco > 0 ? Math.round(((product.preco - salePrice) / product.preco) * 100) : 0

  const pixPercent = settings.pix_discount_enabled ? settings.pix_discount_percent : 0
  const pixPrice = pixPercent > 0 ? currentPrice - calculatePixDiscount(currentPrice, 0, pixPercent) : null

  const requiresFlavor = productRequiresFlavor(product.produto_sabores)
  const soldOut = product.estoque <= 0
  const hasRating = product.total_avaliacoes > 0

  return (
    <article className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-200 hover:border-[#D0D5DD] hover:shadow-soft">
      <div className="relative">
        <Link
          to={productUrl}
          tabIndex={-1}
          aria-hidden
          className="block aspect-square overflow-hidden bg-surface"
        >
          <img
            src={image}
            alt={product.nome}
            loading="lazy"
            decoding="async"
            className={cn(
              'h-full w-full object-contain p-4 mix-blend-multiply transition duration-500 ease-out group-hover:scale-[1.03] sm:p-5',
              soldOut && 'opacity-60',
            )}
          />
        </Link>

        {(discount > 0 || soldOut) && (
          <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5 sm:left-3 sm:top-3">
            {discount > 0 && (
              <span className="rounded-full bg-promo px-2 py-0.5 text-xs font-semibold text-white tabular-nums">
                -{discount}%
              </span>
            )}
            {soldOut && (
              <span className="rounded-full border border-line bg-white/90 px-2 py-0.5 text-xs font-semibold text-ink">
                Esgotado
              </span>
            )}
          </div>
        )}

        {requiresFlavor && !soldOut && (
          <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-full border border-line bg-white/90 px-2 py-0.5 text-[11px] font-medium text-ink-soft sm:bottom-3 sm:left-3">
            Variações
          </span>
        )}

        <div className="absolute right-2.5 top-2.5 z-10 sm:right-3 sm:top-3">
          <FavoriteButton productId={product.id} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {product.marca && (
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted sm:text-xs">{product.marca}</p>
        )}
        <h3 className="mt-1 text-sm font-semibold leading-5 text-ink">
          <Link
            to={productUrl}
            className="line-clamp-2 min-h-[2.5rem] rounded-sm transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          >
            {product.nome}
          </Link>
        </h3>

        {hasRating && (
          <p className="mt-1.5 flex items-center gap-1 text-xs">
            <Star size={13} aria-hidden className="fill-amber-400 text-amber-400" />
            <span className="font-semibold text-ink">{product.avaliacao_media.toFixed(1).replace('.', ',')}</span>
            <span className="text-muted">
              ({product.total_avaliacoes}
              <span className="sr-only"> avaliações</span>)
            </span>
          </p>
        )}

        <div className="mt-auto pt-3">
          {onSale && (
            <p className="text-xs text-muted line-through tabular-nums">
              <span className="sr-only">De </span>
              {formatCurrency(product.preco)}
            </p>
          )}
          <p className="text-base font-bold tracking-tight text-ink tabular-nums sm:text-lg">
            {onSale && <span className="sr-only">Por </span>}
            {formatCurrency(currentPrice)}
          </p>
          {pixPrice !== null && (
            <p className="mt-0.5 text-xs text-muted">
              <span className="font-semibold text-brand tabular-nums">{formatCurrency(pixPrice)}</span> no Pix
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={soldOut || isStoreDemoMode}
          className={cn(
            'mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-[13px] font-semibold transition-colors duration-200 sm:h-11 sm:text-sm',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20',
            'bg-brand-mint text-brand enabled:hover:bg-brand enabled:hover:text-white enabled:active:bg-brand-hover',
            'disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted',
          )}
          onClick={() => {
            if (requiresFlavor) {
              navigate(productUrl)
              return
            }
            const result = addItem(product)
            notify(
              result.message ?? (result.success ? 'Produto adicionado ao carrinho' : 'Não foi possível adicionar'),
              result.success ? 'success' : 'error',
            )
          }}
        >
          {soldOut ? (
            'Indisponível'
          ) : requiresFlavor ? (
            <>
              <span className="sm:hidden">Ver variações</span>
              <span className="hidden sm:inline">Escolher variação</span>
              <span className="sr-only"> de {product.nome}</span>
            </>
          ) : (
            <>
              <ShoppingBag size={16} aria-hidden />
              Adicionar
              <span className="sr-only"> {product.nome} ao carrinho</span>
            </>
          )}
        </button>
      </div>
    </article>
  )
}
