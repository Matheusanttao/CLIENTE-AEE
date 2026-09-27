import { ImageOff, Minus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { optimizeCloudinaryUrl } from '../lib/cloudinary'
import type { CartItem } from '../types'
import { formatCurrency } from '../utils/format'

const stepButton =
  'grid h-10 w-10 place-items-center text-ink transition-colors hover:bg-surface focus-visible:relative focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:text-muted/50 disabled:hover:bg-transparent'

export function CartLineItem({
  item,
  maxStock,
  onQuantityChange,
  onRemove,
}: {
  item: CartItem
  /** Estoque disponivel da linha (produto ou variacao). Quando informado, limita o botao "+". */
  maxStock?: number
  /** Retorne `false` quando a alteracao for recusada (ex.: sem estoque) para o campo voltar ao valor atual. */
  onQuantityChange: (quantity: number) => boolean | void
  onRemove: () => void
}) {
  const { product, flavor, quantity } = item
  // Rascunho do campo de quantidade enquanto o cliente digita (null = mostra a quantidade real).
  const [draft, setDraft] = useState<string | null>(null)
  const cover = [...(product.imagens_produtos ?? [])].sort((a, b) => a.ordem - b.ordem)[0]
  const unitPrice = product.preco_promocional ?? product.preco
  const hasSale = product.preco_promocional !== null && product.preco_promocional < product.preco
  const productUrl = `/produto/${product.slug}`
  const canIncrease = maxStock === undefined || quantity < maxStock

  return (
    <article className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-4 gap-y-3 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-x-5">
      <Link
        to={productUrl}
        tabIndex={-1}
        aria-hidden="true"
        className="block h-20 w-20 overflow-hidden rounded-xl bg-surface sm:row-span-2 sm:h-24 sm:w-24"
      >
        {cover ? (
          <img
            src={optimizeCloudinaryUrl(cover.url, 240)}
            alt={cover.alt || product.nome}
            loading="lazy"
            className="h-full w-full object-contain p-1.5 mix-blend-multiply"
          />
        ) : (
          <span className="grid h-full w-full place-items-center text-muted/60">
            <ImageOff size={22} aria-hidden="true" />
          </span>
        )}
      </Link>

      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          {product.marca && <p className="truncate text-xs font-medium text-muted">{product.marca}</p>}
          <Link
            to={productUrl}
            className="mt-0.5 block text-sm font-semibold leading-snug text-ink transition-colors hover:text-brand sm:text-base"
          >
            <h2 className="line-clamp-2">{product.nome}</h2>
          </Link>
          {flavor && (
            <p className="mt-1 text-sm text-muted">
              Variação: <span className="font-medium text-ink">{flavor.nome}</span>
            </p>
          )}
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
            {hasSale && <span className="text-xs text-muted line-through">{formatCurrency(product.preco)}</span>}
            <span className="font-medium text-ink tabular-nums">{formatCurrency(unitPrice)}</span>
            <span className="text-xs text-muted">/ unidade</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remover ${product.nome} do carrinho`}
          title="Remover"
          className="-mr-2 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-danger focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
        >
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:col-start-2">
        <div className="inline-flex items-center overflow-hidden rounded-xl border border-line bg-white">
          <button
            type="button"
            className={stepButton}
            aria-label="Diminuir quantidade"
            disabled={quantity <= 1}
            onClick={() => {
              setDraft(null)
              onQuantityChange(quantity - 1)
            }}
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={`Quantidade de ${product.nome}`}
            value={draft ?? String(quantity)}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '').slice(0, 5)
              setDraft(digits)
              const next = Number(digits)
              if (digits && next >= 1 && onQuantityChange(next) === false) setDraft(null)
            }}
            onBlur={() => setDraft(null)}
            className="h-10 w-12 border-x border-line bg-white text-center text-sm font-semibold text-ink tabular-nums outline-none focus:bg-brand-mint/40"
          />
          <button
            type="button"
            className={stepButton}
            aria-label="Aumentar quantidade"
            disabled={!canIncrease}
            onClick={() => {
              setDraft(null)
              onQuantityChange(quantity + 1)
            }}
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
        <p className="text-right">
          <span className="block text-xs text-muted">Total</span>
          <span className="text-base font-bold text-ink tabular-nums">{formatCurrency(unitPrice * quantity)}</span>
        </p>
      </div>
    </article>
  )
}
