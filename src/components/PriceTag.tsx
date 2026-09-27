import { formatCurrency } from '../utils/format'

export function PriceTag({ price, salePrice }: { price: number; salePrice?: number | null }) {
  return (
    <div>
      {salePrice && <p className="text-sm text-gray-400 line-through">{formatCurrency(price)}</p>}
      <p className="text-xl font-black text-black">{formatCurrency(salePrice ?? price)}</p>
    </div>
  )
}
