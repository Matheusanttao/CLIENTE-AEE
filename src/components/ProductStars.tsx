import { Star } from 'lucide-react'
import { cn } from '../utils/cn'

/** Linha de 5 estrelas (nota real do produto ou da avaliacao). */
export function ProductStars({
  value,
  size = 14,
  className,
}: {
  value: number
  size?: number
  className?: string
}) {
  const filled = Math.round(Math.min(Math.max(value, 0), 5))
  const label = value.toFixed(1).replace('.', ',')

  return (
    <span role="img" aria-label={`Nota ${label} de 5`} className={cn('inline-flex items-center gap-0.5', className)}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={size}
          aria-hidden
          className={index < filled ? 'fill-amber-400 text-amber-400' : 'fill-line text-line'}
        />
      ))}
    </span>
  )
}
