import { ChevronDown, Grid3x3, Menu, Package } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { useAvailableProductCategories } from '../hooks/useProducts'
import { cn } from '../utils/cn'

export function CategoryNav() {
  const { settings } = useSiteSettings()
  const { data: availableCategories = [] } = useAvailableProductCategories()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const availableCategorySet = new Set(availableCategories)
  const navCategories = settings.categories.filter(
    (category) => category.show_in_nav && availableCategorySet.has(category.name),
  )
  const allCategories = settings.categories.filter(
    (category) => category.name.trim() && availableCategorySet.has(category.name),
  )

  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="relative border-t border-white/10 bg-ink">
      <div className="no-scrollbar container flex h-12 items-center gap-5 overflow-x-auto sm:gap-6">
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="true"
            onClick={() => setOpen((current) => !current)}
            className={cn(
              'flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-wide transition',
              open ? 'text-brand' : 'text-white hover:text-brand',
            )}
          >
            <Menu size={16} />
            Categorias
            <ChevronDown size={14} className={cn('transition', open && 'rotate-180')} />
          </button>

          {open && (
            <div className="absolute left-0 top-[calc(100%+0.65rem)] z-50 w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-black/[0.06] bg-white text-ink shadow-soft animate-float-up">
              <div className="border-b border-line bg-surface px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Menu de produtos</p>
                <Link
                  to="/catalogo"
                  onClick={() => setOpen(false)}
                  className="mt-2 flex items-center gap-3 rounded-xl bg-ink px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-soft"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-ink">
                    <Package size={16} />
                  </span>
                  Ver todos os produtos
                </Link>
              </div>

              <div className="max-h-[min(60vh,360px)] overflow-y-auto p-2">
                {allCategories.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted">
                    Nenhuma categoria cadastrada ainda. Cadastre em Configuracoes no admin.
                  </p>
                ) : (
                  <ul className="grid gap-0.5">
                    {allCategories.map((category) => (
                      <li key={category.name}>
                        <Link
                          to={`/catalogo?categoria=${encodeURIComponent(category.name)}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface">
                            {category.image ? (
                              <img
                                src={category.image}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Grid3x3 size={14} className="text-muted" />
                            )}
                          </span>
                          <span className="min-w-0 truncate">{category.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <span className="h-5 w-px shrink-0 bg-white/15" />

        <nav className="flex min-w-max flex-1 items-center gap-6 text-[11.5px] font-semibold uppercase tracking-wide text-white/70 sm:gap-7">
          <NavLink
            to="/catalogo"
            end={!location.search.includes('categoria') && !location.search.includes('sort')}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-1.5 whitespace-nowrap transition hover:text-white',
                isActive && location.pathname === '/catalogo' && !location.search.includes('categoria')
                  ? 'text-brand'
                  : undefined,
              )
            }
          >
            <Package size={14} />
            Todos os produtos
          </NavLink>

          {navCategories.map((category) => (
            <NavLink
              key={category.name}
              to={`/catalogo?categoria=${encodeURIComponent(category.name)}`}
              className="whitespace-nowrap transition hover:text-white"
            >
              {category.label}
            </NavLink>
          ))}

          <NavLink
            to="/catalogo?sort=price-asc"
            className="flex items-center gap-1 whitespace-nowrap text-brand transition hover:text-brand-hover"
          >
            Promocoes
          </NavLink>
        </nav>
      </div>

      {open && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-ink/20 lg:bg-transparent"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  )
}
