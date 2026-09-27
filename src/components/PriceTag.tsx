import { cn } from '../utils/cn'
import { formatCurrency } from '../utils/format'

/** Preco de destaque (pagina do produto): preco antigo riscado + selo de desconto calculado dos precos reais. */
export function PriceTag({
  price,
  salePrice,
  className,
}: {
  price: number
  salePrice?: number | null
  className?: string
}) {
  const current = salePrice ?? price
  const onSale = salePrice != null && salePrice < price
  const discount = onSale && price > 0 ? Math.round(((price - salePrice) / price) * 100) : 0

  return (
    <div className={cn('min-w-0', className)}>
      {onSale && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted line-through tabular-nums">
            <span className="sr-only">De </span>
            {formatCurrency(price)}
          </span>
          {discount > 0 && (
            <span className="rounded-full bg-promo px-2 py-0.5 text-xs font-semibold text-white">-{discount}%</span>
          )}
        </div>
      )}
      <p className={cn('text-3xl font-bold tracking-tight text-ink tabular-nums', onSale && 'mt-1')}>
        {onSale && <span className="sr-only">Por </span>}
        {formatCurrency(current)}
      </p>
    </div>
  )
}
