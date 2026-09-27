import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, type ReactNode } from 'react'

export function SectionCarousel({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    ref.current?.scrollBy({
      left: direction === 'left' ? -360 : 360,
      behavior: 'smooth',
    })
  }

  return (
    <div className="relative">
      <button
        aria-label="Anterior"
        className="absolute -left-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-white/90 text-ink shadow-card backdrop-blur transition hover:-translate-y-1/2 hover:scale-105 hover:border-ink/20 md:grid"
        onClick={() => scroll('left')}
      >
        <ChevronLeft size={20} />
      </button>
      <div ref={ref} className="no-scrollbar flex gap-5 overflow-x-auto scroll-smooth px-1 pb-3 pt-1">
        {children}
      </div>
      <button
        aria-label="Proximo"
        className="absolute -right-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-white/90 text-ink shadow-card backdrop-blur transition hover:-translate-y-1/2 hover:scale-105 hover:border-ink/20 md:grid"
        onClick={() => scroll('right')}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
