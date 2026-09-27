import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Package,
  Plus,
  Settings,
  ShoppingBag,
  Tag,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AdminCard, AdminEmptyState, AdminPill, AdminSectionHeader, AdminStatusBadge } from '../components/admin/AdminUI'
import { adminButtonClass, adminOrderStatusLabels, adminOrderStatusTone } from '../components/admin/adminStyles'
import { Skeleton } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getAllCustomers } from '../services/admin'
import { getAllOrders } from '../services/orders'
import type { Order } from '../types'
import { cn } from '../utils/cn'
import { formatCurrency, formatDate } from '../utils/format'

interface AdminOrder extends Order {
  usuarios?: { nome: string; email: string } | null
}

export function AdminPage() {
  const { user } = useAuth()
  const firstName =
    (user?.user_metadata?.nome as string | undefined)?.split(' ')[0] ??
    user?.email?.split('@')[0] ??
    'Admin'

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('produtos').select('estoque')
      if (error) throw error
      return data ?? []
    },
  })

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['admin-customers-count'],
    queryFn: getAllCustomers,
  })

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: getAllOrders,
  })

  const typedOrders = orders as AdminOrder[]
  const paidStatuses = new Set(['aprovado', 'enviado', 'entregue'])
  const paidOrders = typedOrders.filter((order) => paidStatuses.has(order.status))
  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0)
  const pendingOrders = typedOrders.filter((order) => order.status === 'pendente').length
  const lowStock = products.filter((product) => product.estoque <= 5).length
  const totalStock = products.reduce((sum, product) => sum + product.estoque, 0)
  const recentOrders = typedOrders.slice(0, 7)
  const isLoading = productsLoading || customersLoading || ordersLoading

  const statusBreakdown = (['pendente', 'aprovado', 'enviado', 'entregue'] as const).map((status) => ({
    status,
    count: typedOrders.filter((order) => order.status === status).length,
  }))
  const maxStatus = Math.max(...statusBreakdown.map((item) => item.count), 1)

  const todayRaw = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
  const todayLabel = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1)

  return (
    <div className="grid gap-4 sm:gap-5">
      <AdminCard padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted">{todayLabel}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">
              Olá, {firstName}
            </h2>
            <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-muted">
              Acompanhe vendas, estoque e pedidos em um só lugar.
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Link to="/admin/pedidos" className={adminButtonClass('secondary', 'md', 'flex-1 sm:flex-none')}>
              <ShoppingBag size={16} />
              Ver pedidos
            </Link>
            <Link to="/admin/produtos/novo" className={adminButtonClass('primary', 'md', 'flex-1 sm:flex-none')}>
              <Plus size={16} />
              Novo produto
            </Link>
          </div>
        </div>
      </AdminCard>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[138px] animate-pulse rounded-2xl border border-line bg-white" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={<TrendingUp size={18} />}
            label="Receita confirmada"
            value={formatCurrency(revenue)}
            hint={`${paidOrders.length} ${paidOrders.length === 1 ? 'pedido pago' : 'pedidos pagos'}`}
            delay={0}
          />
          <Metric
            icon={<ShoppingBag size={18} />}
            label="Pedidos"
            value={String(typedOrders.length)}
            hint={pendingOrders > 0 ? `${pendingOrders} aguardando pagamento` : 'Nenhum pagamento pendente'}
            delay={60}
          />
          <Metric
            icon={<Package size={18} />}
            label="Produtos"
            value={String(products.length)}
            hint={`${totalStock} unidades em estoque`}
            alert={lowStock > 0 ? `${lowStock} com estoque baixo` : undefined}
            delay={120}
          />
          <Metric
            icon={<Users size={18} />}
            label="Clientes"
            value={String(customers.length)}
            hint="Contas cadastradas na loja"
            delay={180}
          />
        </div>
      )}

      <div className="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <AdminCard>
          <AdminSectionHeader
            title="Pedidos recentes"
            description="Últimas movimentações da loja"
            action={
              <Link
                to="/admin/pedidos"
                className="inline-flex min-h-10 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-brand transition hover:text-brand-hover"
              >
                Ver todos
                <ArrowRight size={16} />
              </Link>
            }
          />

          {isLoading ? (
            <div className="grid gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <AdminEmptyState
              icon={<ShoppingBag size={20} />}
              title="Nenhum pedido ainda"
              description="Quando as vendas começarem, elas aparecem aqui."
            />
          ) : (
            <ul className="-mx-1 divide-y divide-line">
              {recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl px-1 py-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-sm font-semibold text-ink-soft">
                      {(order.usuarios?.nome ?? 'C').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {order.usuarios?.nome ?? 'Cliente'}
                      </p>
                      <p className="text-xs text-muted">
                        #{order.id.slice(0, 8)} · {formatDate(order.criado_em)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pl-[52px] sm:pl-0">
                    <AdminStatusBadge status={order.status} />
                    <p className="min-w-[5.5rem] text-right text-sm font-bold tabular-nums text-ink">
                      {formatCurrency(order.total)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <div className="grid content-start gap-4 sm:gap-5">
          {!isLoading && lowStock > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-white p-4 shadow-card sm:p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
                  <AlertTriangle size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-ink">Estoque baixo</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {lowStock} {lowStock === 1 ? 'produto está' : 'produtos estão'} com 5 ou menos
                    unidades.
                  </p>
                  <Link
                    to="/admin/produtos"
                    className="mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand transition hover:text-brand-hover"
                  >
                    Revisar produtos
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </section>
          )}

          <AdminCard>
            <AdminSectionHeader title="Status dos pedidos" description="Distribuição atual" />
            {isLoading ? (
              <Skeleton className="h-36 rounded-xl" />
            ) : (
              <div className="space-y-4">
                {statusBreakdown.map(({ status, count }) => (
                  <div key={status}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="inline-flex items-center gap-2 font-medium text-ink">
                        <span className={cn('h-2 w-2 rounded-full', adminOrderStatusTone[status].dot)} aria-hidden />
                        {adminOrderStatusLabels[status]}
                      </span>
                      <span className="font-semibold tabular-nums text-ink">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-700"
                        style={{ width: `${(count / maxStatus) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>

          <AdminCard>
            <AdminSectionHeader title="Atalhos rápidos" description="Vá direto para a ação" />
            <div className="grid gap-1">
              <QuickLink to="/admin/produtos" label="Gerenciar produtos" icon={<Package size={18} />} />
              <QuickLink to="/admin/pedidos" label="Atualizar pedidos" icon={<ShoppingBag size={18} />} />
              <QuickLink to="/admin/cupons" label="Criar cupom" icon={<Tag size={18} />} />
              <QuickLink to="/admin/configuracoes" label="Configurar a loja" icon={<Settings size={18} />} />
              <QuickLink to="/admin/clientes" label="Ver clientes" icon={<Users size={18} />} />
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
  hint,
  alert,
  delay = 0,
}: {
  icon: ReactNode
  label: string
  value: string
  hint: string
  alert?: string
  delay?: number
}) {
  return (
    <div
      className="admin-metric flex flex-col rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-mint text-brand">{icon}</span>
      </div>
      <p className="mt-2 truncate text-2xl font-bold tracking-tight tabular-nums text-ink">{value}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        <p className="text-xs text-muted">{hint}</p>
        {alert && <AdminPill tone="warning">{alert}</AdminPill>}
      </div>
    </div>
  )
}

function QuickLink({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
  return (
    <Link
      to={to}
      className="group flex min-h-11 items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-ink transition hover:bg-surface"
    >
      <span className="inline-flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface text-ink-soft transition group-hover:bg-brand-mint group-hover:text-brand">
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </span>
      <ArrowUpRight size={16} className="shrink-0 text-muted transition group-hover:text-brand" />
    </Link>
  )
}
