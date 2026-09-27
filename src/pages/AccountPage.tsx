import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  ChevronRight,
  Heart,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  PackageSearch,
  RotateCcw,
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { OrderStatusBadge } from '../components/AccountOrderStatus'
import { Button, Skeleton } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { getMyAddresses } from '../services/addresses'
import { getMyFavorites } from '../services/favorites'
import { getMyOrders } from '../services/orders'
import { formatCurrency, formatDate } from '../utils/format'

export function AccountPage() {
  const { user, signOut } = useAuth()
  const { settings, whatsappUrl } = useSiteSettings()
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: () => getMyOrders(user?.id ?? ''),
    enabled: Boolean(user),
  })

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: () => getMyAddresses(user?.id ?? ''),
    enabled: Boolean(user),
  })

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => getMyFavorites(user?.id ?? ''),
    enabled: Boolean(user),
  })

  const rawName = user?.user_metadata?.nome
  const fullName = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : ''
  const firstName = fullName.split(/\s+/)[0]
  const initial = (fullName || user?.email || 'C').charAt(0).toUpperCase()
  // getMyOrders ja retorna do mais recente para o mais antigo
  const recentOrders = orders.slice(0, 3)
  const hasWhatsapp = Boolean(settings.whatsapp_number?.trim())

  return (
    <>
      <Helmet>
        <title>{`Minha conta - ${settings.store_name}`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="grid gap-6">
        <div className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-mint text-xl font-bold text-brand-hover">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted">Bem-vindo(a) de volta</p>
              <h1 className="truncate text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {firstName ? `Olá, ${firstName}` : 'Minha conta'}
              </h1>
              {user?.email && <p className="mt-0.5 truncate text-sm text-muted">{user.email}</p>}
            </div>
          </div>
          <Button variant="secondary" onClick={signOut} className="shrink-0 sm:self-center">
            <LogOut size={16} />
            Sair
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Metric
            icon={<Package size={20} />}
            label="Pedidos"
            value={orders.length}
            action="Ver pedidos"
            to="/minha-conta/pedidos"
          />
          <Metric
            icon={<MapPin size={20} />}
            label="Endereços"
            value={addresses.length}
            action="Gerenciar"
            to="/minha-conta/enderecos"
          />
          <Metric
            icon={<Heart size={20} />}
            label="Favoritos"
            value={favorites.length}
            action="Ver favoritos"
            to="/minha-conta/favoritos"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-line bg-white lg:col-span-2">
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
              <h2 className="text-base font-semibold text-ink">Pedidos recentes</h2>
              {orders.length > 0 && (
                <Link
                  to="/minha-conta/pedidos"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-brand transition-colors hover:text-brand-hover"
                >
                  Ver todos <ArrowRight size={15} />
                </Link>
              )}
            </div>

            {ordersLoading && (
              <div className="grid gap-3 p-5 sm:p-6">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            )}

            {!ordersLoading && recentOrders.length === 0 && (
              <div className="px-5 py-10 text-center sm:px-6">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface text-muted">
                  <Package size={22} />
                </span>
                <p className="mt-4 font-semibold text-ink">Você ainda não fez pedidos</p>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
                  Quando você finalizar uma compra, ela aparecerá aqui.
                </p>
                <Link
                  to="/catalogo"
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
                >
                  Explorar produtos
                </Link>
              </div>
            )}

            {!ordersLoading && recentOrders.length > 0 && (
              <ul className="divide-y divide-line">
                {recentOrders.map((order) => {
                  const itemsCount = (order.itens_pedido ?? []).reduce((sum, item) => sum + item.quantidade, 0)
                  return (
                    <li key={order.id}>
                      <Link
                        to="/minha-conta/pedidos"
                        className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface/60 sm:px-6"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <span className="text-sm font-semibold text-ink">#{order.id.slice(0, 8)}</span>
                            <OrderStatusBadge status={order.status} />
                          </div>
                          <p className="mt-1 text-sm text-muted">
                            {formatDate(order.criado_em)}
                            {itemsCount > 0 && ` · ${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'}`}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-bold tabular-nums text-ink">
                          {formatCurrency(order.total)}
                        </span>
                        <ChevronRight size={18} className="hidden shrink-0 text-muted sm:block" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="flex flex-col rounded-2xl bg-surface p-5 sm:p-6">
            <h2 className="text-base font-semibold text-ink">Precisa de ajuda?</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Acompanhe a entrega do seu pedido ou fale com a nossa equipe.
            </p>
            <div className="mt-5 grid gap-2">
              <HelpLink to="/rastrear-pedido" icon={<PackageSearch size={18} />} label="Rastrear pedido" />
              {hasWhatsapp && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-[#d0d5dd] hover:text-brand"
                >
                  <MessageCircle size={18} className="shrink-0 text-brand" />
                  Falar no WhatsApp
                </a>
              )}
              <HelpLink to="/trocas-devolucoes" icon={<RotateCcw size={18} />} label="Trocas e devoluções" />
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

function Metric({
  icon,
  label,
  value,
  action,
  to,
}: {
  icon: ReactNode
  label: string
  value: number
  action: string
  to: string
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-2xl border border-line bg-white p-5 transition hover:border-[#d0d5dd] hover:shadow-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-mint text-brand">{icon}</span>
        <span className="text-3xl font-bold tabular-nums tracking-tight text-ink">{value}</span>
      </div>
      <p className="mt-4 text-sm font-semibold text-ink">{label}</p>
      <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand transition-colors group-hover:text-brand-hover">
        {action}
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

function HelpLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-[#d0d5dd] hover:text-brand"
    >
      <span className="shrink-0 text-brand">{icon}</span>
      {label}
    </Link>
  )
}
