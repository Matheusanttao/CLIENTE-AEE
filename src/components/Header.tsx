import { Heart, Search, ShoppingCart, User } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { formatCurrency } from '../utils/format'
import { CategoryNav } from './CategoryNav'
import { StoreLogo } from './StoreLogo'
import { TopBar } from './TopBar'

export function Header() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { items, total } = useCart()
  const count = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink text-white">
      <TopBar />
      <div className="container grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 sm:gap-4 sm:py-4 lg:grid-cols-[minmax(200px,300px)_1fr_minmax(240px,320px)]">
        <StoreLogo />
        <form
          className="col-span-2 row-start-2 flex h-12 items-center overflow-hidden rounded-full bg-white pl-5 transition focus-within:ring-4 focus-within:ring-brand/20 lg:col-span-1 lg:col-start-2 lg:row-start-1"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            navigate(`/catalogo?busca=${encodeURIComponent(String(form.get('busca') ?? ''))}`)
          }}
        >
          <input
            name="busca"
            placeholder="Buscar produtos..."
            className="h-full w-full bg-transparent px-1 text-sm text-ink outline-none placeholder:text-gray-400"
          />
          <button
            type="submit"
            aria-label="Buscar"
            className="m-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white transition hover:bg-ink-soft"
          >
            <Search size={18} />
          </button>
        </form>
        <div className="col-start-2 row-start-1 flex items-center justify-end gap-1 sm:gap-3 lg:col-start-3">
          {user ? (
            <Link
              to="/minha-conta"
              className="inline-flex h-10 w-10 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-white transition hover:border-brand/50 hover:bg-white/10 sm:h-auto sm:w-auto sm:px-4 sm:py-2"
            >
              <User size={18} />
              <span className="hidden sm:inline">Minha conta</span>
            </Link>
          ) : (
            <Link
              to="/login"
              aria-label="Entrar"
              className="inline-flex h-10 w-10 items-center justify-center gap-2 rounded-full bg-brand text-sm font-bold text-ink shadow-brand transition hover:bg-brand-hover sm:h-auto sm:w-auto sm:px-4 sm:py-2"
            >
              <User size={18} />
              <span className="hidden sm:inline">Entrar</span>
            </Link>
          )}
          <Link
            to="/minha-conta/favoritos"
            aria-label="Favoritos"
            className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/10 sm:h-11 sm:w-11"
          >
            <Heart size={22} />
          </Link>
          <Link
            to="/carrinho"
            aria-label="Carrinho"
            className="grid h-10 w-10 place-items-center text-white transition hover:text-brand sm:flex sm:w-auto sm:gap-3"
          >
            <span className="relative">
              <ShoppingCart size={22} />
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-ink">
                {count}
              </span>
            </span>
            <strong className="hidden text-sm font-semibold md:block">{formatCurrency(total)}</strong>
          </Link>
        </div>
      </div>
      <CategoryNav />
    </header>
  )
}
