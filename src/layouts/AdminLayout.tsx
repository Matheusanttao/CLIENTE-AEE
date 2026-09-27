import {
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PackagePlus,
  Settings,
  ShoppingBag,
  Store,
  Tag,
  Users,
  X,
} from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { PageSpinner } from '../components/PageSpinner'
import { useAuth } from '../contexts/AuthContext'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { useAdminNewOrderAlerts } from '../hooks/useAdminNewOrderAlerts'
import { cn } from '../utils/cn'

const navItems: {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
}[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/produtos', label: 'Produtos', icon: Package, end: true },
  { to: '/admin/produtos/novo', label: 'Novo produto', icon: PackagePlus },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { to: '/admin/cupons', label: 'Cupons', icon: Tag },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/configuracoes', label: 'Configuracoes', icon: Settings },
]

const pageMeta: Record<string, { title: string; description: string }> = {
  '/admin': {
    title: 'Dashboard',
    description: 'Visao geral do desempenho da loja',
  },
  '/admin/produtos': {
    title: 'Produtos',
    description: 'Edite ou remova itens do catalogo',
  },
  '/admin/produtos/novo': {
    title: 'Novo produto',
    description: 'Cadastre um item no catalogo',
  },
  '/admin/pedidos': {
    title: 'Pedidos',
    description: 'Status, clientes e entregas',
  },
  '/admin/cupons': {
    title: 'Cupons',
    description: 'Descontos e campanhas',
  },
  '/admin/clientes': {
    title: 'Clientes',
    description: 'Usuarios cadastrados',
  },
  '/admin/configuracoes': {
    title: 'Configuracoes',
    description: 'Cores, textos, frete e promocoes',
  },
}

const buildVersion = import.meta.env.VITE_BUILD_VERSION

export function AdminLayout() {
  const { user, signOut } = useAuth()
  const { settings, loading: settingsLoading } = useSiteSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { unreadCount, clearUnread } = useAdminNewOrderAlerts()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (location.pathname.startsWith('/admin/pedidos')) clearUnread()
  }, [location.pathname, clearUnread])

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin')
  }

  const meta = pageMeta[location.pathname] ?? {
    title: 'Painel',
    description: 'Gestao da loja',
  }

  const displayName =
    user?.user_metadata?.nome ?? user?.email?.split('@')[0] ?? 'Admin'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() ?? '')
    .join('')
  const customLogo = settings.logo_enabled && Boolean(settings.logo_url?.trim())
  const brandInitials = (settings.store_name_short || settings.store_name || 'Passarin')
    .slice(0, 3)
    .toUpperCase()

  return (
    <div className="admin-shell min-h-screen">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-dvh w-[240px] flex-col border-r border-black/[0.06] bg-white text-ink transition-transform duration-300 ease-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="relative overflow-hidden border-b border-black/[0.05] px-4 py-4">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-brand/30 blur-3xl"
          />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {settingsLoading ? (
                <div className="h-9 w-28 animate-pulse rounded-xl bg-ink/10" aria-hidden />
              ) : customLogo ? (
                <img
                  src={settings.logo_url}
                  alt={settings.store_name}
                  className="h-9 w-auto max-w-[120px] object-contain object-left"
                  decoding="async"
                />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-ink shadow-brand">
                  <span className="font-display text-xs font-black tracking-tight">{brandInitials}</span>
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold tracking-tight text-ink">Admin</p>
                <p className="truncate text-[10px] font-medium text-muted">
                  {settingsLoading ? '...' : settings.store_name}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-xl p-2 text-muted transition hover:bg-surface hover:text-ink lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
          <p className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            Menu
          </p>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={Boolean(end)}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-brand-mint shadow-[inset_0_0_0_1px_rgba(196,240,0,0.45)]'
                    : 'hover:bg-surface',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-brand" />
                  )}
                  <span
                    className={cn(
                      'grid h-7 w-7 place-items-center rounded-lg transition',
                      isActive
                        ? 'bg-brand text-ink'
                        : 'bg-surface text-muted group-hover:bg-white group-hover:text-ink',
                    )}
                  >
                    <Icon size={15} strokeWidth={2.2} />
                  </span>
                  <span className={cn('flex-1', isActive ? 'text-ink' : 'text-muted group-hover:text-ink')}>
                    {label}
                  </span>
                  {to === '/admin/pedidos' && unreadCount > 0 && (
                    <span className="grid min-w-5 place-items-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-black/[0.05] p-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-black/[0.05] bg-surface px-2.5 py-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink text-[10px] font-black text-brand">
              {initials || 'AD'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-ink">{displayName}</p>
              <p className="truncate text-[10px] text-muted">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <NavLink
              to="/"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-black/[0.06] bg-white px-2 py-2 text-[11px] font-semibold text-ink transition hover:border-ink/15 hover:bg-surface"
            >
              <Store size={13} />
              Loja
            </NavLink>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-black/[0.06] bg-white px-2 py-2 text-[11px] font-semibold text-ink transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut size={13} />
              Sair
            </button>
          </div>
          <p className="text-center text-[9px] font-medium tracking-wide text-muted/70">
            Versão {buildVersion}
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col lg:pl-[240px]">
        <header className="sticky top-0 z-30 border-b border-black/[0.05] bg-[#f4f5f2]/90 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-2.5 sm:px-5 lg:px-6">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-xl border border-black/[0.06] bg-white text-ink shadow-sm lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={18} />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="hidden h-1.5 w-1.5 rounded-full bg-brand sm:inline-block" />
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  Painel administrativo
                </p>
              </div>
              <h1 className="truncate font-display text-xl font-bold tracking-tight text-ink leading-tight">
                {meta.title}
              </h1>
            </div>

            <div className="hidden items-center gap-2 rounded-xl border border-black/[0.06] bg-white px-2.5 py-1.5 shadow-sm md:flex">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-[10px] font-black text-brand">
                {initials || 'AD'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-ink">{displayName}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Admin</p>
              </div>
            </div>
          </div>
        </header>

        <main className="admin-main relative flex-1 px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(196,240,0,0.07),_transparent_55%)]"
          />
          <div className="relative w-full">
            <Suspense fallback={<PageSpinner label="Carregando..." />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
