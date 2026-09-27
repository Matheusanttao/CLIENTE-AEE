import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowUpRight,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Tag,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AdminCard, AdminSectionHeader } from '../components/admin/AdminUI'
import { Skeleton } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { orderStatusLabels } from '../lib/constants'
import { supabase } from '../lib/supabase'
import { getAllCustomers } from '../services/admin'
import { getAllOrders } from '../services/orders'
import type { Order } from '../types'
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

  const todayLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })

  return (
    <div className="grid gap-3">
      <AdminCard padding="none" className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(135deg,#0d0f12_0%,#16191f_52%,#1c2210_100%)]"
        />
        <div
          aria-hidden
          className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-brand/25 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute bottom-0 left-1/3 h-32 w-72 rounded-full bg-brand/10 blur-3xl"
        />
        <div className="relative grid gap-3 p-4 sm:p-5 lg:grid-cols-[1.4fr_auto] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand ring-1 ring-white/10">
              <Sparkles size={11} />
              {todayLabel}
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Ola, {firstName}
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/55 sm:text-sm">
              Acompanhe vendas, estoque e pedidos em um so lugar.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-[240px]">
            <MiniStat label="Pagos" value={String(paidOrders.length)} />
            <MiniStat label="Pendentes" value={String(pendingOrders)} />
          </div>
        </div>
      </AdminCard>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={<TrendingUp size={18} />}
            label="Receita confirmada"
            value={formatCurrency(revenue)}
            hint={`${paidOrders.length} pedidos pagos`}
            tone="brand"
            delay={0}
          />
          <Metric
            icon={<ShoppingBag size={18} />}
            label="Pedidos"
            value={String(typedOrders.length)}
            hint={pendingOrders > 0 ? `${pendingOrders} aguardando pagamento` : 'Fila limpa'}
            tone="dark"
            delay={60}
          />
          <Metric
            icon={<Package size={18} />}
            label="Produtos"
            value={String(products.length)}
            hint={`${totalStock} unidades em estoque`}
            delay={120}
          />
          <Metric
            icon={<Users size={18} />}
            label="Clientes"
            value={String(customers.length)}
            hint={lowStock > 0 ? `${lowStock} com estoque baixo` : 'Estoque saudavel'}
            delay={180}
          />
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-[1.45fr_0.9fr]">
        <AdminCard>
          <AdminSectionHeader
            title="Pedidos recentes"
            description="Ultimas movimentacoes da loja"
            action={
              <Link
                to="/admin/pedidos"
                className="inline-flex items-center gap-1 rounded-full bg-ink px-3.5 py-2 text-xs font-bold text-white transition hover:bg-ink-soft"
              >
                Ver todos
                <ArrowUpRight size={14} />
              </Link>
            }
          />

          {isLoading ? (
            <Skeleton className="h-56 rounded-2xl" />
          ) : recentOrders.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-[#fafaf8] px-4 py-14 text-center">
              <ShoppingBag className="text-muted" size={22} />
              <p className="mt-3 text-sm font-semibold text-ink">Nenhum pedido ainda</p>
              <p className="mt-1 text-sm text-muted">Quando as vendas comecarem, elas aparecem aqui.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f7f8f5] px-4 py-3.5 transition hover:bg-[#f1f2ee]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-xs font-black text-ink shadow-sm ring-1 ring-black/[0.04]">
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
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} />
                    <p className="min-w-[4.5rem] text-right text-sm font-bold tabular-nums text-ink">
                      {formatCurrency(order.total)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>

        <div className="grid gap-3">
          <AdminCard>
            <AdminSectionHeader title="Atalhos rapidos" description="Ir direto para a acao" />
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <QuickLink to="/admin/produtos" label="Gerenciar produtos" icon={<Package size={16} />} />
              <QuickLink to="/admin/pedidos" label="Atualizar pedidos" icon={<ShoppingBag size={16} />} />
              <QuickLink to="/admin/cupons" label="Criar cupom" icon={<Tag size={16} />} />
              <QuickLink to="/admin/configuracoes" label="Configurar o site" icon={<Settings size={16} />} />
              <QuickLink to="/admin/clientes" label="Ver clientes" icon={<Users size={16} />} />
            </div>
          </AdminCard>

          <AdminCard>
            <AdminSectionHeader title="Status dos pedidos" description="Distribuicao atual" />
            {isLoading ? (
              <Skeleton className="h-36 rounded-2xl" />
            ) : (
              <div className="space-y-3.5">
                {statusBreakdown.map(({ status, count }) => (
                  <div key={status}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink">{orderStatusLabels[status]}</span>
                      <span className="tabular-nums text-muted">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#eef0eb]">
                      <div
                        className="h-full rounded-full bg-ink transition-all duration-700"
                        style={{
                          width: `${(count / maxStatus) * 100}%`,
                          background:
                            status === 'pendente'
                              ? '#f59e0b'
                              : status === 'aprovado'
                                ? '#16a34a'
                                : status === 'enviado'
                                  ? '#0ea5e9'
                                  : '#c4f000',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>

          {!isLoading && lowStock > 0 && (
            <AdminCard className="border-amber-200/80 bg-[linear-gradient(180deg,#fffbeb_0%,#ffffff_100%)]">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-ink">Estoque baixo</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {lowStock} {lowStock === 1 ? 'produto esta' : 'produtos estao'} com 5 ou menos
                    unidades.
                  </p>
                  <Link
                    to="/admin/produtos"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-ink hover:underline"
                  >
                    Revisar produtos
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </AdminCard>
          )}
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/8 px-4 py-3 ring-1 ring-white/10 backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
  hint,
  tone = 'light',
  delay = 0,
}: {
  icon: ReactNode
  label: string
  value: string
  hint: string
  tone?: 'light' | 'dark' | 'brand'
  delay?: number
}) {
  const styles = {
    light: 'border-black/[0.06] bg-white text-ink',
    dark: 'border-transparent bg-ink text-white',
    brand: 'border-transparent bg-brand text-ink',
  }[tone]

  const iconStyles = {
    light: 'bg-[#f2f4ee] text-ink',
    dark: 'bg-white/10 text-brand',
    brand: 'bg-ink text-brand',
  }[tone]

  const muted = {
    light: 'text-muted',
    dark: 'text-white/45',
    brand: 'text-ink/55',
  }[tone]

  return (
    <div
      className={`admin-metric rounded-2xl border p-3.5 shadow-[0_1px_0_rgba(13,15,18,0.04),0_12px_28px_-24px_rgba(13,15,18,0.14)] ${styles}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${iconStyles}`}>{icon}</div>
      </div>
      <p className={`mt-3 text-xs ${muted}`}>{label}</p>
      <p className="mt-0.5 font-display text-xl font-bold tracking-tight tabular-nums sm:text-2xl">
        {value}
      </p>
      <p className={`mt-1 text-[11px] ${muted}`}>{hint}</p>
    </div>
  )
}

function QuickLink({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-xl border border-black/[0.05] bg-[#f7f8f5] px-3 py-2.5 text-sm font-semibold text-ink transition hover:border-ink/15 hover:bg-white"
    >
      <span className="inline-flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-ink shadow-sm ring-1 ring-black/[0.04] transition group-hover:bg-brand">
          {icon}
        </span>
        {label}
      </span>
      <ArrowUpRight size={14} className="text-muted transition group-hover:text-ink" />
    </Link>
  )
}

function StatusBadge({ status }: { status: Order['status'] }) {
  const styles: Record<Order['status'], string> = {
    pendente: 'bg-amber-100 text-amber-800',
    aprovado: 'bg-emerald-100 text-emerald-800',
    preparando: 'bg-violet-100 text-violet-800',
    recusado: 'bg-red-100 text-red-700',
    cancelado: 'bg-zinc-100 text-zinc-600',
    enviado: 'bg-sky-100 text-sky-800',
    entregue: 'bg-brand-soft text-ink',
  }

  return (
    <span className={`rounded-lg px-2 py-1 text-[10px] font-bold tracking-wide ${styles[status]}`}>
      {orderStatusLabels[status]}
    </span>
  )
}
