import { useQuery } from '@tanstack/react-query'
import { Heart, MapPin, Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Button } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { getMyAddresses } from '../services/addresses'
import { getMyFavorites } from '../services/favorites'
import { getMyOrders } from '../services/orders'

export function AccountPage() {
  const { user, signOut } = useAuth()
  const { data: orders = [] } = useQuery({
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

  return (
    <div className="grid gap-6">
      <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">Bem-vindo</p>
            <h1 className="text-3xl font-black text-black">{user?.user_metadata?.nome ?? user?.email}</h1>
          </div>
          <Button variant="secondary" onClick={signOut}>Sair</Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric icon={<Package />} label="Pedidos" value={String(orders.length)} to="/minha-conta/pedidos" />
        <Metric icon={<MapPin />} label="Enderecos" value={String(addresses.length)} to="/minha-conta/enderecos" />
        <Metric icon={<Heart />} label="Favoritos" value={String(favorites.length)} to="/minha-conta/favoritos" />
      </div>
    </div>
  )
}

function Metric({ icon, label, value, to }: { icon: ReactNode; label: string; value: string; to: string }) {
  return (
    <Link to={to} className="rounded-3xl bg-gray-50 p-6 transition hover:bg-gray-100">
      <div className="text-green-600">{icon}</div>
      <p className="mt-4 text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-black text-black">{value}</p>
    </Link>
  )
}
