import { useEffect, useMemo, useState } from 'react'
import { fallbackProductImage } from '../lib/constants'
import { optimizeCloudinaryUrl } from '../lib/cloudinary'
import type { ProductImage } from '../types'
import { cn } from '../utils/cn'

const MAX_GALLERY_PHOTOS = 5

export function ProductGallery({ images, name }: { images?: ProductImage[]; name: string }) {
  const gallery = useMemo(() => {
    if (!images || images.length === 0) {
      return [{ id: 'fallback', url: fallbackProductImage, alt: name, ordem: 0, produto_id: '' }]
    }
    return [...images].sort((a, b) => a.ordem - b.ordem).slice(0, MAX_GALLERY_PHOTOS)
  }, [images, name])

  const [active, setActive] = useState(gallery[0])

  useEffect(() => {
    setActive(gallery[0])
  }, [gallery])

  return (
    <div className="grid gap-4 lg:grid-cols-[96px_1fr]">
      {gallery.length > 1 && (
        <div className="order-2 flex gap-2.5 overflow-auto pb-1 lg:order-1 lg:grid lg:gap-2.5 lg:overflow-visible lg:pb-0">
          {gallery.map((image) => (
            <button
              key={image.id}
              type="button"
              className={cn(
                'aspect-square min-w-[4.5rem] shrink-0 overflow-hidden rounded-xl border bg-[#f4f5f2] p-1 transition',
                active.id === image.id ? 'border-ink ring-2 ring-brand/40' : 'border-line hover:border-ink/30',
              )}
              onClick={() => setActive(image)}
            >
              <img
                src={optimizeCloudinaryUrl(image.url, 160)}
                alt={image.alt ?? name}
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </div>
      )}
      <div
        className={cn(
          'order-1 grid aspect-square min-h-0 min-w-0 place-items-center overflow-hidden rounded-[2rem] bg-[#f4f5f2] p-4 sm:p-6 lg:order-2',
          gallery.length <= 1 && 'lg:col-span-2',
        )}
      >
        <img
          src={optimizeCloudinaryUrl(active.url, 1100)}
          alt={active.alt ?? name}
          className="h-full min-h-0 w-full min-w-0 object-contain"
        />
      </div>
    </div>
  )
}
