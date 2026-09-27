import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useRef, useState, type TouchEvent } from 'react'
import { fallbackProductImage } from '../lib/constants'
import { optimizeCloudinaryUrl } from '../lib/cloudinary'
import type { ProductImage } from '../types'
import { cn } from '../utils/cn'

const MAX_GALLERY_PHOTOS = 5
const SWIPE_THRESHOLD = 40

const arrowClass =
  'absolute top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-ink shadow-card transition-colors hover:border-[#D0D5DD] hover:text-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20'

export function ProductGallery({ images, name }: { images?: ProductImage[]; name: string }) {
  const gallery = useMemo(() => {
    if (!images || images.length === 0) {
      return [{ id: 'fallback', url: fallbackProductImage, alt: name, ordem: 0, produto_id: '' }]
    }
    return [...images].sort((a, b) => a.ordem - b.ordem).slice(0, MAX_GALLERY_PHOTOS)
  }, [images, name])

  // Guarda o id da foto escolhida; se a galeria mudar (outro produto), volta para a primeira foto.
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeIndex = Math.max(0, gallery.findIndex((image) => image.id === activeId))
  const active = gallery[activeIndex]
  const hasMany = gallery.length > 1
  const touchStartX = useRef<number | null>(null)

  const go = (step: number) => {
    const next = (activeIndex + step + gallery.length) % gallery.length
    setActiveId(gallery[next].id)
  }

  const handleTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  const handleTouchEnd = (event: TouchEvent) => {
    const start = touchStartX.current
    touchStartX.current = null
    const end = event.changedTouches[0]?.clientX
    if (!hasMany || start === null || end === undefined) return
    const delta = end - start
    if (Math.abs(delta) < SWIPE_THRESHOLD) return
    go(delta < 0 ? 1 : -1)
  }

  return (
    <div className="min-w-0">
      <div
        className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-surface"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={optimizeCloudinaryUrl(active.url, 1100)}
          alt={active.alt ?? name}
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-contain p-6 mix-blend-multiply sm:p-10"
        />

        {hasMany && (
          <>
            <button type="button" aria-label="Foto anterior" className={cn(arrowClass, 'left-3')} onClick={() => go(-1)}>
              <ChevronLeft size={18} aria-hidden />
            </button>
            <button type="button" aria-label="Próxima foto" className={cn(arrowClass, 'right-3')} onClick={() => go(1)}>
              <ChevronRight size={18} aria-hidden />
            </button>
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-line bg-white/90 px-2.5 py-1 text-xs font-medium text-muted tabular-nums">
              {activeIndex + 1} / {gallery.length}
            </span>
          </>
        )}
      </div>

      {hasMany && (
        <div className="no-scrollbar -mx-1 mt-3 flex gap-2.5 overflow-x-auto p-1 sm:mt-4 sm:gap-3">
          {gallery.map((image, index) => {
            const selected = index === activeIndex
            return (
              <button
                key={image.id}
                type="button"
                aria-label={`Ver foto ${index + 1} de ${gallery.length}`}
                aria-current={selected ? 'true' : undefined}
                className={cn(
                  'h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-surface p-1.5 transition sm:h-[72px] sm:w-[72px]',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20',
                  selected ? 'border-brand ring-2 ring-brand/20' : 'border-line hover:border-[#D0D5DD]',
                )}
                onClick={() => setActiveId(image.id)}
              >
                <img
                  src={optimizeCloudinaryUrl(image.url, 160)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain mix-blend-multiply"
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
