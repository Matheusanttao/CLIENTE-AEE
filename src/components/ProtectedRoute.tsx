import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isStoreDemoMode, STORE_DEMO_MESSAGE } from '../lib/storeMode'
import { AdminLoginPage } from '../pages/AdminLoginPage'
import { EmptyState } from './ui'
import { PageSpinner } from './PageSpinner'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <PageSpinner />
  if (isStoreDemoMode) {
    return (
      <section className="container py-12 md:py-16">
        <div className="mx-auto max-w-xl">
          <EmptyState title="Conta temporariamente indisponível" description={STORE_DEMO_MESSAGE} />
          <div className="mt-6 flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-[#d0d5dd] hover:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
            >
              Voltar para a loja
            </Link>
          </div>
        </div>
      </section>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export function AdminRoute() {
  const { user, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <PageSpinner fullScreen label="Carregando painel..." />
  }

  if (!user || !isAdmin) {
    return <AdminLoginPage key={location.pathname} />
  }

  return <Outlet />
}
