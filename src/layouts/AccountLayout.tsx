import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { PageSpinner } from '../components/PageSpinner'
import { useAuth } from '../contexts/AuthContext'

export function AccountLayout() {
  const { isAdmin } = useAuth()

  return (
    <section className="container grid gap-8 py-10 lg:grid-cols-[240px_1fr]">
      <aside className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="px-3 text-lg font-black">Minha conta</h2>
        <nav className="mt-4 grid gap-1 text-sm font-semibold">
          <NavLink
            to="/minha-conta"
            end
            className={({ isActive }) =>
              `rounded-2xl px-3 py-2 font-bold ${isActive ? 'bg-ink text-white' : 'text-ink hover:bg-gray-100'}`
            }
          >
            Visao geral
          </NavLink>
          <NavLink
            to="/minha-conta/pedidos"
            className={({ isActive }) =>
              `rounded-2xl px-3 py-2 font-bold ${isActive ? 'bg-ink text-white' : 'text-ink hover:bg-gray-100'}`
            }
          >
            Pedidos
          </NavLink>
          <NavLink
            to="/minha-conta/enderecos"
            className={({ isActive }) =>
              `rounded-2xl px-3 py-2 font-bold ${isActive ? 'bg-ink text-white' : 'text-ink hover:bg-gray-100'}`
            }
          >
            Enderecos
          </NavLink>
          <NavLink
            to="/minha-conta/favoritos"
            className={({ isActive }) =>
              `rounded-2xl px-3 py-2 font-bold ${isActive ? 'bg-ink text-white' : 'text-ink hover:bg-gray-100'}`
            }
          >
            Favoritos
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className="rounded-2xl bg-brand px-3 py-2 font-bold text-black hover:bg-brand-hover">
              Painel Admin
            </NavLink>
          )}
        </nav>
      </aside>
      <div>
        <Suspense fallback={<PageSpinner />}>
          <Outlet />
        </Suspense>
      </div>
    </section>
  )
}
