import { useQuery } from '@tanstack/react-query'
import { AdminCard, AdminListRow } from '../components/admin/AdminUI'
import { Skeleton } from '../components/ui'
import { getAllCustomers } from '../services/admin'
import { formatDate } from '../utils/format'

export function AdminCustomersPage() {
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: getAllCustomers,
  })

  return (
    <AdminCard>
      {isLoading && <Skeleton className="h-40 rounded-2xl" />}
      <div className="grid gap-2.5">
        {customers.map((customer) => (
          <AdminListRow
            key={customer.id}
            className="md:grid-cols-[1fr_auto_auto] md:items-center"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-xs font-black text-ink shadow-sm ring-1 ring-black/[0.04]">
                {(customer.nome || 'C').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <strong className="text-ink">{customer.nome}</strong>
                <p className="text-sm text-muted">{customer.email}</p>
              </div>
            </div>
            <span
              className={`inline-flex w-fit rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                customer.role === 'admin'
                  ? 'bg-brand-soft text-ink'
                  : 'bg-white text-muted ring-1 ring-black/[0.06]'
              }`}
            >
              {customer.role}
            </span>
            <span className="text-sm text-muted">{formatDate(customer.criado_em)}</span>
          </AdminListRow>
        ))}
      </div>
      {!isLoading && customers.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">Nenhum cliente cadastrado.</p>
      )}
    </AdminCard>
  )
}
