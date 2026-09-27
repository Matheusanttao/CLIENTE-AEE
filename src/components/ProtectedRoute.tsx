import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isStoreDemoMode, STORE_DEMO_MESSAGE } from '../lib/storeMode'
import { AdminLoginPage } from '../pages/AdminLoginPage'
import { Button, EmptyState } from './ui'
import { PageSpinner } from './PageSpinner'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <PageSpinner />
  if (isStoreDemoMode) {
    return (
      <section className="container py-10">
        <EmptyState title="Conta temporariamente indisponível" description={STORE_DEMO_MESSAGE} />
        <div className="mt-6 flex justify-center">
          <Link to="/">
            <Button variant="secondary">Voltar para a loja</Button>
          </Link>
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
