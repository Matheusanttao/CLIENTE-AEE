import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { cn } from '../utils/cn'

const baseLinkClass =
  'whitespace-nowrap rounded underline-offset-4 transition-colors focus-visible:text-brand focus-visible:underline focus-visible:outline-none'
const linkClass = cn(baseLinkClass, 'hover:text-brand')

function Divider() {
  return <span className="h-3 w-px bg-line" aria-hidden />
}

export function TopBar() {
  const { user, isAdmin } = useAuth()
  const { settings, whatsappUrl } = useSiteSettings()

  if (!settings.topbar_enabled) return null

  const text = settings.topbar_text?.trim()

  return (
    <div className={cn('border-b border-line bg-surface text-xs text-muted', !text && 'hidden md:block')}>
      {/* No mobile o aviso quebra linha em vez de ser cortado; do md em diante divide a linha com os atalhos. */}
      <div className="container flex min-h-9 items-center justify-center gap-6 py-2 md:h-9 md:justify-between md:py-0">
        <p className="min-w-0 text-center font-medium leading-snug md:truncate md:text-left">{text}</p>

        <nav aria-label="Links rápidos" className="hidden shrink-0 items-center gap-4 md:flex">
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className={linkClass}>
            Atendimento
          </a>
          <Divider />
          <Link to="/rastrear-pedido" className={linkClass}>
            Rastrear pedido
          </Link>
          <Divider />
          {user ? (
            <Link to="/minha-conta" className={linkClass}>
              Minha conta
            </Link>
          ) : (
            <Link to="/login" className={linkClass}>
              Entrar / Cadastrar
            </Link>
          )}
          {isAdmin && (
            <>
              <Divider />
              <Link to="/admin" className={cn(baseLinkClass, 'font-semibold text-brand hover:text-brand-hover')}>
                Admin
              </Link>
            </>
          )}
        </nav>
      </div>
    </div>
  )
}
