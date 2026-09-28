import { ArrowRight, ChevronDown, Grid3x3, LayoutGrid, Tag } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../utils/cn'
import {
  PROMO_CATALOG_PATH,
  categoryCatalogPath,
  categoryThumbUrl,
  useCatalogLinkState,
  useHeaderCategories,
  useRouteScopedOpen,
} from './headerNav'

/** Link da barra de categorias: sublinhado azul de 2px indica a pagina ativa. */
const navLinkClass = (active: boolean, tone: 'default' | 'brand' = 'default') =>
  cn(
    'relative inline-flex h-12 shrink-0 items-center gap-1.5 whitespace-nowrap text-sm transition-colors',
    'after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand after:transition-opacity',
    'focus-visible:outline-none focus-visible:after:opacity-100',
    active ? 'after:opacity-100' : 'after:opacity-0',
    tone === 'brand'
      ? 'font-semibold text-brand hover:text-brand-hover'
      : cn('font-semibold focus-visible:text-brand', active ? 'text-brand' : 'text-ink-soft hover:text-brand'),
  )

/** Barra de categorias do desktop (no mobile a gaveta do menu substitui). */
export function CategoryNav() {
  const { navCategories, allCategories } = useHeaderCategories()
  const { isAllActive, isPromoActive, isCategoryActive } = useCatalogLinkState()
  // O menu fica preso a rota em que foi aberto: ao navegar (inclusive voltar/avancar), ele fecha sozinho.
  const { open, close, toggle } = useRouteScopedOpen()
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      close()
      buttonRef.current?.focus()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  const wideMenu = allCategories.length > 6

  return (
    <div className="hidden border-t border-line lg:block">
      <div className="container flex items-center gap-7">
        <div className="relative shrink-0" ref={menuRef}>
          <button
            ref={buttonRef}
            type="button"
            aria-expanded={open}
            aria-controls="header-categories-menu"
            onClick={toggle}
            className={cn(
              'relative inline-flex h-12 items-center gap-2 text-sm font-semibold transition-colors',
              'after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand after:opacity-0 after:transition-opacity',
              'focus-visible:text-brand focus-visible:outline-none focus-visible:after:opacity-100',
              open ? 'text-brand' : 'text-ink hover:text-brand',
            )}
          >
            <LayoutGrid size={18} aria-hidden />
            Categorias
            <ChevronDown size={16} aria-hidden className={cn('transition-transform duration-200', open && 'rotate-180')} />
          </button>

          {open && (
            <div
              id="header-categories-menu"
              className={cn(
                'absolute left-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-white shadow-soft animate-float-up',
                wideMenu ? 'w-[540px]' : 'w-[360px]',
              )}
            >
              <div className="px-4 pb-1 pt-4">
                <p className="text-sm font-semibold text-ink">Navegue por categoria</p>
              </div>

              <div className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
                {allCategories.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted">Nenhuma categoria disponível no momento.</p>
                ) : (
                  <ul className={cn('grid gap-0.5', wideMenu && 'grid-cols-2')}>
                    {allCategories.map((category) => {
                      const active = isCategoryActive(category.name)
                      return (
                        <li key={category.name}>
                          <Link
                            to={categoryCatalogPath(category.name)}
                            onClick={close}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors',
                              'focus-visible:bg-surface focus-visible:outline-none',
                              active ? 'bg-brand-mint text-brand' : 'text-ink hover:bg-surface',
                            )}
                          >
                            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-sand-soft">
                              {category.image ? (
                                <img
                                  src={categoryThumbUrl(category.image)}
                                  alt=""
                                  loading="lazy"
                                  decoding="async"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Grid3x3 size={16} className="text-muted" aria-hidden />
                              )}
                            </span>
                            <span className="min-w-0 truncate">{category.name}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div className="border-t border-line p-2">
                <Link
                  to="/catalogo"
                  onClick={close}
                  className="group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand-mint focus-visible:bg-brand-mint focus-visible:outline-none"
                >
                  Ver todos os produtos
                  <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        <span className="h-5 w-px shrink-0 bg-line" aria-hidden />

        <nav aria-label="Categorias em destaque" className="no-scrollbar flex min-w-0 flex-1 items-center gap-7 overflow-x-auto">
          <Link to="/catalogo" aria-current={isAllActive ? 'page' : undefined} className={navLinkClass(isAllActive)}>
            Todos os produtos
          </Link>

          {navCategories.map((category) => {
            const active = isCategoryActive(category.name)
            return (
              <Link
                key={category.name}
                to={categoryCatalogPath(category.name)}
                aria-current={active ? 'page' : undefined}
                className={navLinkClass(active)}
              >
                {category.label || category.name}
              </Link>
            )
          })}
        </nav>

        <Link
          to={PROMO_CATALOG_PATH}
          aria-current={isPromoActive ? 'page' : undefined}
          className={navLinkClass(isPromoActive, 'brand')}
        >
          <Tag size={16} aria-hidden />
          Promoções
        </Link>
      </div>
    </div>
  )
}
