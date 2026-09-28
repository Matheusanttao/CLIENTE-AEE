import { ArrowRight, Heart, Menu, Search, ShoppingBag, User } from 'lucide-react'
import { useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { cn } from '../utils/cn'
import { formatCurrency } from '../utils/format'
import { CategoryNav } from './CategoryNav'
import { HeaderMobileMenu } from './HeaderMobileMenu'
import { useRouteScopedOpen } from './headerNav'
import { StoreLogo } from './StoreLogo'
import { TopBar } from './TopBar'

/** Botoes de icone do cabecalho: fundo neutro no hover, foco com anel azul suave. */
const iconAction =
  'relative h-10 min-w-10 shrink-0 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 lg:h-11 lg:min-w-11'

function SearchForm({ className }: { className?: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  // Mantem o termo buscado visivel no campo enquanto o cliente esta no catalogo.
  const currentQuery =
    location.pathname === '/catalogo' ? (new URLSearchParams(location.search).get('busca') ?? '') : ''

  return (
    <form
      role="search"
      className={cn('group relative', className)}
      onSubmit={(event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        const query = String(form.get('busca') ?? '').trim()
        const field = event.currentTarget.elements.namedItem('busca')
        if (field instanceof HTMLInputElement) field.blur()
        navigate(query ? `/catalogo?busca=${encodeURIComponent(query)}` : '/catalogo')
      }}
    >
      <label htmlFor="header-search" className="sr-only">
        Buscar produtos
      </label>
      <Search
        size={20}
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted transition-colors group-focus-within:text-brand"
      />
      <input
        key={currentQuery}
        id="header-search"
        name="busca"
        type="search"
        defaultValue={currentQuery}
        placeholder="Buscar tênis, perfumes e mais"
        autoComplete="off"
        enterKeyHint="search"
        className={cn(
          'h-12 w-full rounded-xl border border-line bg-surface pl-12 pr-14 text-[15px] text-ink outline-none transition sm:pr-28',
          'placeholder:text-muted hover:border-line-strong focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15',
          'appearance-none [&::-webkit-search-cancel-button]:appearance-none',
        )}
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="absolute inset-y-1 right-1 inline-flex w-10 items-center justify-center gap-2 rounded-lg bg-brand text-sm font-bold text-white shadow-brand transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 sm:w-auto sm:px-5"
      >
        <ArrowRight size={18} aria-hidden className="sm:hidden" />
        <span className="hidden sm:inline">Buscar</span>
      </button>
    </form>
  )
}

export function Header() {
  const { user } = useAuth()
  const { items, total } = useCart()
  const count = items.reduce((sum, item) => sum + item.quantity, 0)
  // A gaveta fica presa a rota em que foi aberta: qualquer navegacao a fecha sem precisar de efeito.
  const { open: menuOpen, openMenu, close: closeMenu } = useRouteScopedOpen()
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  const accountLabel = user ? 'Minha conta' : 'Entrar'
  const cartLabel =
    count > 0 ? `Carrinho: ${count} ${count === 1 ? 'item' : 'itens'}, total ${formatCurrency(total)}` : 'Carrinho vazio'

  return (
    <>
      <TopBar />
      <header className="sticky top-0 z-40 border-b border-line bg-white shadow-sm">
        <div className="container grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 pb-3 pt-2.5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-x-10 lg:py-3">
          <div className="flex min-w-0 items-center gap-1">
            <button
              ref={menuButtonRef}
              type="button"
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
              aria-controls="header-mobile-menu"
              onClick={openMenu}
              className={cn(iconAction, '-ml-2 inline-flex lg:hidden')}
            >
              <Menu size={24} aria-hidden />
            </button>
            <StoreLogo />
          </div>

          <SearchForm className="col-span-2 row-start-2 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:mx-auto lg:w-full lg:max-w-[640px]" />

          <nav
            aria-label="Atalhos da conta"
            className="col-start-2 row-start-1 -mr-2 flex items-center justify-end gap-0.5 sm:gap-1 lg:col-start-3 lg:-mr-3"
          >
            <Link
              to={user ? '/minha-conta' : '/login'}
              aria-label={accountLabel}
              className={cn(iconAction, 'inline-flex gap-2 md:px-3')}
            >
              <User size={22} aria-hidden />
              <span className="hidden text-sm font-semibold md:inline">{accountLabel}</span>
            </Link>

            <Link
              to="/minha-conta/favoritos"
              aria-label="Favoritos"
              title="Favoritos"
              className={cn(iconAction, 'hidden sm:inline-flex')}
            >
              <Heart size={22} aria-hidden />
            </Link>

            <Link to="/carrinho" aria-label={cartLabel} className={cn(iconAction, 'inline-flex gap-3 md:pl-2.5 md:pr-3')}>
              <span className="relative inline-flex">
                <ShoppingBag size={22} aria-hidden />
                {count > 0 && (
                  <span
                    className="absolute -right-2.5 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-semibold leading-none tabular-nums text-white ring-2 ring-white"
                    aria-hidden
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </span>
              <span className="hidden text-left leading-tight md:block" aria-hidden>
                <span className="block text-xs font-medium text-muted">Carrinho</span>
                <span className="block text-sm font-bold tabular-nums text-ink">{formatCurrency(total)}</span>
              </span>
            </Link>
          </nav>
        </div>

        <CategoryNav />
      </header>

      <HeaderMobileMenu open={menuOpen} onClose={closeMenu} returnFocusRef={menuButtonRef} />
    </>
  )
}
