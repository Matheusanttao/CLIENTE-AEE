import { Trash2 } from 'lucide-react'
import type { CartItem } from '../types'
import { formatCurrency } from '../utils/format'
import { Button, Input } from './ui'

export function CartLineItem({
  item,
  onQuantityChange,
  onRemove,
}: {
  item: CartItem
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
}) {
  return (
    <article className="grid gap-4 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-[120px_1fr_auto]">
      <img
        src={item.product.imagens_produtos?.[0]?.url}
        alt={item.product.nome}
        className="aspect-square rounded-2xl bg-gray-100 object-cover"
      />
      <div>
        <h2 className="font-black text-black">{item.product.nome}</h2>
        <p className="mt-1 text-sm text-gray-500">{item.product.marca}</p>
        <p className="mt-4 font-bold text-black">
          {formatCurrency(item.product.preco_promocional ?? item.product.preco)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Input
          type="number"
          min={1}
          value={item.quantity}
          className="w-24"
          onChange={(event) => onQuantityChange(Number(event.target.value))}
        />
        <Button variant="danger" onClick={onRemove} aria-label="Remover item">
          <Trash2 size={18} />
        </Button>
      </div>
    </article>
  )
}
