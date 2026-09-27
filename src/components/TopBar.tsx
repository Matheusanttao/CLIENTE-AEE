import { Headphones, PackageSearch, Shield, User, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSiteSettings } from '../contexts/SiteSettingsContext'

export function TopBar() {
  const { user, isAdmin } = useAuth()
  const { settings, whatsappUrl } = useSiteSettings()

  if (!settings.topbar_enabled) return null

  return (
    <div className="bg-ink text-[11px] font-medium tracking-wide text-white/85">
      <div className="container flex h-10 items-center justify-between gap-4">
        <p className="flex items-center gap-2 whitespace-nowrap uppercase">
          <Zap size={14} className="text-brand" fill="currentColor" />
          <span>{settings.topbar_text}</span>
        </p>
        <div className="hidden items-center gap-7 md:flex">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 transition hover:text-brand"
          >
            <Headphones size={14} /> Atendimento
          </a>
          <Link to="/rastrear-pedido" className="flex items-center gap-2 transition hover:text-brand">
            <PackageSearch size={14} /> Rastrear pedido
          </Link>
          {user ? (
            <>
              <Link to="/minha-conta" className="flex items-center gap-2 whitespace-nowrap transition hover:text-brand">
                <User size={14} /> Minha conta
              </Link>
              {isAdmin && (
                <Link to="/admin" className="flex items-center gap-2 whitespace-nowrap text-brand transition hover:text-white">
                  <Shield size={14} /> Admin
                </Link>
              )}
            </>
          ) : (
            <Link to="/login" className="flex items-center gap-2 whitespace-nowrap transition hover:text-brand">
              <User size={14} /> Entrar / Cadastrar
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
