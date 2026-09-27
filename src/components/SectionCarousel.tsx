import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../utils/cn'

/** Largura padrao dos itens: ~1,6 card no celular, 2,5 no sm, 3 no md e 4 inteiros a partir do lg. */
const defaultItemClass =
  'w-[62%] sm:w-[calc((100%_-_2.5rem)/2.5)] md:w-[calc((100%_-_2.5rem)/3)] lg:w-[calc((100%_-_3.75rem)/4)]'

const arrowClass =
  'grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-ink shadow-card transition-colors duration-200 hover:border-[#D0D5DD] hover:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-white'

export function SectionCarousel({
  children,
  header,
  label = 'Carrossel de produtos',
  itemClassName = defaultItemClass,
  className,
}: {
  children: ReactNode
  /** Conteudo a esquerda das setas (ex.: <SectionHeader />). */
  header?: ReactNode
  /** Nome acessivel da area rolavel. */
  label?: string
  itemClassName?: string
  className?: string
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })
  const itemCount = Children.count(children)

  const updateEdges = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const maxScroll = track.scrollWidth - track.clientWidth
    const start = track.scrollLeft <= 2
    const end = track.scrollLeft >= maxScroll - 2
    setEdges((current) => (current.start === start && current.end === end ? current : { start, end }))
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const frame = window.requestAnimationFrame(updateEdges)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => updateEdges())
    observer?.observe(track)
    return () => {
      window.cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [updateEdges, itemCount])

  const scroll = (direction: 'left' | 'right') => {
    const track = trackRef.current
    if (!track) return
    const firstItem = track.firstElementChild as HTMLElement | null
    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0
    const step = firstItem ? firstItem.offsetWidth + gap : 320
    const perPage = Math.max(1, Math.floor((track.clientWidth + gap) / step))
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    track.scrollBy({
      left: (direction === 'left' ? -1 : 1) * step * perPage,
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }

  const scrollable = !(edges.start && edges.end)

  return (
    <div className={className}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">{header}</div>
        {scrollable && (
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <button
              type="button"
              aria-label="Ver anteriores"
              className={arrowClass}
              disabled={edges.start}
              onClick={() => scroll('left')}
            >
              <ChevronLeft size={20} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Ver próximos"
              className={arrowClass}
              disabled={edges.end}
              onClick={() => scroll('right')}
            >
              <ChevronRight size={20} aria-hidden />
            </button>
          </div>
        )}
      </div>

      <div
        ref={trackRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        onScroll={updateEdges}
        className={cn(
          'no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-5 pt-1',
          'sm:-mx-1 sm:scroll-px-1 sm:gap-5 sm:px-1',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15',
          (header || scrollable) && 'mt-5 sm:mt-6',
        )}
      >
        {Children.map(children, (child) => (
          <div className={cn('min-w-0 shrink-0 snap-start', itemClassName)}>{child}</div>
        ))}
      </div>
    </div>
  )
}
