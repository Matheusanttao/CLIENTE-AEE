import { Plus, ShoppingCart } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { FavoriteButton } from './FavoriteButton'
import { fallbackProductImage } from '../lib/constants'
import { optimizeCloudinaryUrl } from '../lib/cloudinary'
import { isStoreDemoMode } from '../lib/storeMode'
import { productRequiresFlavor } from '../services/flavors'
import type { Product } from '../types'
import { formatCurrency } from '../utils/format'
import { Button } from './ui'
import { useCart } from '../contexts/CartContext'
import { useToast } from './ui'

export function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { notify } = useToast()
  const cover =
    [...(product.imagens_produtos ?? [])].sort((a, b) => a.ordem - b.ordem)[0]?.url ?? fallbackProductImage
  const image = optimizeCloudinaryUrl(cover, 600)
  const salePrice = product.preco_promocional
  const discount = salePrice ? Math.round(((product.preco - salePrice) / product.preco) * 100) : 0
  const requiresFlavor = productRequiresFlavor(product.produto_sabores)

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition duration-300 hover:-translate-y-1.5 hover:border-ink/10 hover:shadow-soft">
      <div className="relative grid aspect-[1.05/1] place-items-center overflow-hidden bg-surface p-5">
        <Link to={`/produto/${product.slug}`} className="grid h-full w-full place-items-center">
          <img
            src={image}
            alt={product.nome}
            loading="lazy"
            className="h-full max-h-44 w-full rounded-xl object-cover transition duration-500 group-hover:scale-105"
          />
          {discount > 0 && (
            <span className="absolute left-3 top-3 rounded-full bg-promo px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
              -{discount}%
            </span>
          )}
          {requiresFlavor && (
            <span className="absolute bottom-3 left-3 rounded-full bg-black/80 px-2.5 py-1 text-[10px] font-bold text-white">
              Sabores
            </span>
          )}
        </Link>
        <FavoriteButton productId={product.id} className="absolute right-3 top-3 z-10" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="min-h-[68px]">
          <Link to={`/produto/${product.slug}`}>
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink transition group-hover:text-ink/70">{product.nome}</h3>
          </Link>
          <div className="mt-2 flex items-center gap-1 text-[11px]">
            <span className="text-amber-400">
              {'★'.repeat(Math.round(product.avaliacao_media)) || '☆'}
            </span>
            <span className="text-muted">({product.total_avaliacoes})</span>
          </div>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div>
            {salePrice && <p className="text-[11px] text-muted line-through">{formatCurrency(product.preco)}</p>}
            <p className="font-display text-lg font-bold text-ink">{formatCurrency(salePrice ?? product.preco)}</p>
          </div>
          <Button
            className="h-11 gap-1.5 rounded-full px-4"
            aria-label={requiresFlavor ? 'Escolher sabor' : 'Adicionar ao carrinho'}
            disabled={product.estoque <= 0 || isStoreDemoMode}
            onClick={() => {
              if (requiresFlavor) {
                navigate(`/produto/${product.slug}`)
                return
              }
              const result = addItem(product)
              notify(result.message ?? (result.success ? 'Produto adicionado ao carrinho' : 'Nao foi possivel adicionar'), result.success ? 'success' : 'error')
            }}
          >
            <ShoppingCart size={16} />
            <Plus size={14} strokeWidth={3} />
          </Button>
        </div>
      </div>
    </article>
  )
}
