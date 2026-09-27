import {
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PackagePlus,
  Settings,
  ShoppingBag,
  Tag,
  Users,
  X,
} from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { PageSpinner } from '../components/PageSpinner'
import { useAuth } from '../contexts/AuthContext'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { useAdminNewOrderAlerts } from '../hooks/useAdminNewOrderAlerts'
import { cn } from '../utils/cn'

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Visão geral',
    items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    title: 'Catálogo',
    items: [
      { to: '/admin/produtos', label: 'Produtos', icon: Package, end: true },
      { to: '/admin/produtos/novo', label: 'Novo produto', icon: PackagePlus },
    ],
  },
  {
    title: 'Vendas',
    items: [
      { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
      { to: '/admin/cupons', label: 'Cupons', icon: Tag },
      { to: '/admin/clientes', label: 'Clientes', icon: Users },
    ],
  },
  {
    title: 'Loja',
    items: [{ to: '/admin/configuracoes', label: 'Configurações', icon: Settings }],
  },
]

const pageMeta: Record<string, { title: string; description: string }> = {
  '/admin': {
    title: 'Dashboard',
    description: 'Visão geral do desempenho da loja',
  },
  '/admin/produtos': {
    title: 'Produtos',
    description: 'Edite, oculte ou remova itens do catálogo',
  },
  '/admin/produtos/novo': {
    title: 'Novo produto',
    description: 'Cadastre um item no catálogo',
  },
  '/admin/pedidos': {
    title: 'Pedidos',
    description: 'Status, clientes e entregas',
  },
  '/admin/cupons': {
    title: 'Cupons',
    description: 'Códigos de desconto e campanhas',
  },
  '/admin/clientes': {
    title: 'Clientes',
    description: 'Contas cadastradas na loja',
  },
  '/admin/configuracoes': {
    title: 'Configurações',
    description: 'Identidade, cores, textos, frete e contato',
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

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin')
  }

  const meta = pageMeta[location.pathname] ?? {
    title: 'Painel',
    description: 'Gestão da loja',
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
  const brandInitials = (settings.store_name_short || settings.store_name || 'A&E')
    .slice(0, 3)
    .toUpperCase()

  return (
    <div className="admin-shell min-h-screen bg-surface">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-dvh w-[264px] max-w-[85vw] flex-col border-r border-line bg-white text-ink transition-transform duration-300 ease-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-soft' : '-translate-x-full',
        )}
        aria-label="Menu do painel"
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-line px-5">
          <Link to="/admin" className="flex min-w-0 items-center gap-3" aria-label="Ir para o dashboard">
            {settingsLoading ? (
              <span className="block h-10 w-32 animate-pulse rounded-lg bg-surface" aria-hidden />
            ) : customLogo ? (
              <img
                src={settings.logo_url}
                alt={settings.store_name}
                className="h-10 w-auto max-w-[150px] object-contain object-left"
                decoding="async"
              />
            ) : (
              <>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white">
                  <span className="text-xs font-bold tracking-tight">{brandInitials}</span>
                </span>
                <span className="truncate text-sm font-semibold text-ink">{settings.store_name}</span>
              </>
            )}
          </Link>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-surface hover:text-ink lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Seções do painel">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-4 last:mb-0">
              <p className="mb-1 px-3 text-xs font-medium text-muted">{group.title}</p>
              <div className="grid gap-0.5">
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={Boolean(end)}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20',
                        isActive
                          ? 'bg-brand-mint text-brand-hover'
                          : 'text-ink-soft hover:bg-surface hover:text-ink',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span
                            aria-hidden
                            className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand"
                          />
                        )}
                        <Icon
                          size={18}
                          strokeWidth={2}
                          className={cn(
                            'shrink-0 transition-colors',
                            isActive ? 'text-brand' : 'text-muted group-hover:text-ink',
                          )}
                        />
                        <span className="flex-1 truncate">{label}</span>
                        {to === '/admin/pedidos' && unreadCount > 0 && (
                          <span
                            className="grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white"
                            aria-label={`${unreadCount} novos pedidos`}
                          >
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 space-y-3 border-t border-line p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand-hover">
              {initials || 'AD'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
              <p className="truncate text-xs text-muted">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink transition hover:border-[#D0D5DD] hover:bg-surface"
            >
              <ExternalLink size={15} />
              Ver loja
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink transition hover:border-red-200 hover:bg-red-50 hover:text-danger"
            >
              <LogOut size={15} />
              Sair
            </button>
          </div>
          {buildVersion && (
            <p className="text-center text-[11px] text-muted/80">Versão {buildVersion}</p>
          )}
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-[72px] w-full max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-white text-ink transition hover:bg-surface lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
              aria-expanded={mobileOpen}
            >
              <Menu size={18} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold leading-tight tracking-tight text-ink sm:text-xl">
                {meta.title}
              </h1>
              <p className="hidden truncate text-sm text-muted sm:block">{meta.description}</p>
            </div>

            <Link
              to="/"
              className="hidden min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink md:inline-flex"
            >
              <ExternalLink size={16} />
              Ver loja
            </Link>

            <div className="hidden items-center gap-2.5 border-l border-line pl-3 md:flex">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand-hover">
                {initials || 'AD'}
              </div>
              <div className="hidden min-w-0 xl:block">
                <p className="max-w-[160px] truncate text-sm font-semibold text-ink">{displayName}</p>
                <p className="text-xs text-muted">Administrador</p>
              </div>
            </div>
          </div>
        </header>

        <main className="admin-main flex-1">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            <Suspense fallback={<PageSpinner label="Carregando..." />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
