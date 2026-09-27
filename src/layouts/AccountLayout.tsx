import { Heart, LayoutDashboard, LayoutGrid, LogOut, MapPin, Package } from 'lucide-react'
import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { PageSpinner } from '../components/PageSpinner'
import { useAuth } from '../contexts/AuthContext'
import { cn } from '../utils/cn'

const accountLinks = [
  { to: '/minha-conta', label: 'Visão geral', icon: LayoutGrid, end: true },
  { to: '/minha-conta/pedidos', label: 'Pedidos', icon: Package, end: false },
  { to: '/minha-conta/enderecos', label: 'Endereços', icon: MapPin, end: false },
  { to: '/minha-conta/favoritos', label: 'Favoritos', icon: Heart, end: false },
] as const

export function AccountLayout() {
  const { user, isAdmin, signOut } = useAuth()
  const rawName = user?.user_metadata?.nome
  const displayName = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : (user?.email ?? 'Cliente')
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <section className="container py-8 md:py-12">
      <div className="grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-10">
        {/* Navegacao no desktop */}
        <aside className="hidden lg:block">
          <div className="rounded-2xl border border-line bg-white p-3 shadow-card">
            <div className="flex items-center gap-3 border-b border-line px-2 pb-4 pt-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-mint text-sm font-bold text-brand-hover">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted">Minha conta</p>
                <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
              </div>
            </div>

            <nav aria-label="Minha conta" className="mt-2 grid gap-1">
              {accountLinks.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15',
                      isActive ? 'bg-brand-mint text-brand-hover' : 'text-ink-soft hover:bg-surface hover:text-ink',
                    )
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="mt-2 grid gap-2 border-t border-line pt-3">
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className="mx-1 inline-flex items-center justify-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15"
                >
                  <LayoutDashboard size={16} />
                  Painel admin
                </NavLink>
              )}
              <button
                type="button"
                onClick={signOut}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15"
              >
                <LogOut size={18} className="shrink-0" />
                Sair da conta
              </button>
            </div>
          </div>
        </aside>

        {/* Navegacao no celular: abas com rolagem horizontal */}
        <nav
          aria-label="Minha conta"
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:hidden"
        >
          {accountLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-transparent bg-brand-mint text-brand-hover'
                    : 'border-line bg-white text-ink-soft hover:bg-surface',
                )
              }
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
            >
              <LayoutDashboard size={16} className="shrink-0" />
              Painel admin
            </NavLink>
          )}
        </nav>

        <div className="min-w-0">
          <Suspense fallback={<PageSpinner />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </section>
  )
}
