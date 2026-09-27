import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { AdminCard, AdminEmptyState, AdminListRow, AdminPill, AdminSectionHeader } from '../components/admin/AdminUI'
import { getAllCustomers } from '../services/admin'
import { formatDate } from '../utils/format'

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  cliente: 'Cliente',
}

export function AdminCustomersPage() {
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: getAllCustomers,
  })

  return (
    <AdminCard>
      <AdminSectionHeader
        title="Clientes cadastrados"
        description={
          customers.length > 0
            ? `${customers.length} ${customers.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}`
            : 'Contas criadas na loja aparecem aqui.'
        }
      />
      {isLoading && (
        <div className="grid gap-2.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[68px] animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      )}
      <div className="grid gap-2.5">
        {customers.map((customer) => (
          <AdminListRow
            key={customer.id}
            className="sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-mint text-sm font-semibold text-brand-hover">
                {(customer.nome || 'C').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{customer.nome}</p>
                <p className="truncate text-sm text-muted">{customer.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pl-[52px] sm:contents">
              <AdminPill tone={customer.role === 'admin' ? 'brand' : 'neutral'}>
                {roleLabels[customer.role] ?? customer.role}
              </AdminPill>
              <span className="text-sm text-muted sm:min-w-[7.5rem] sm:text-right">
                Desde {formatDate(customer.criado_em)}
              </span>
            </div>
          </AdminListRow>
        ))}
      </div>
      {!isLoading && customers.length === 0 && (
        <AdminEmptyState icon={<Users size={20} />} title="Nenhum cliente cadastrado" />
      )}
    </AdminCard>
  )
}
