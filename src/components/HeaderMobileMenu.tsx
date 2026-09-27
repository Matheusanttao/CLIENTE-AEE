import {
  ArrowUpRight,
  ChevronRight,
  Grid3x3,
  Headphones,
  Heart,
  LayoutGrid,
  PackageSearch,
  Shield,
  Tag,
  User,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { cn } from '../utils/cn'
import {
  PROMO_CATALOG_PATH,
  categoryCatalogPath,
  categoryThumbUrl,
  useCatalogLinkState,
  useHeaderCategories,
} from './headerNav'
import { StoreLogo } from './StoreLogo'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

const rowClass = (active = false, tone: 'default' | 'brand' = 'default') =>
  cn(
    'flex min-h-12 items-center gap-3 rounded-xl px-2.5 py-1.5 text-[15px] transition-colors',
    'focus-visible:bg-surface focus-visible:outline-none',
    active
      ? 'bg-brand-mint font-semibold text-brand'
      : tone === 'brand'
        ? 'font-semibold text-brand hover:bg-surface'
        : 'font-medium text-ink hover:bg-surface',
  )

function RowIcon({ icon: Icon, active = false, tone = 'default' }: { icon: LucideIcon; active?: boolean; tone?: 'default' | 'brand' }) {
  return (
    <span
      className={cn(
        'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
        active ? 'bg-white text-brand' : tone === 'brand' ? 'bg-brand-mint text-brand' : 'bg-surface text-ink/70',
      )}
      aria-hidden
    >
      <Icon size={18} />
    </span>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <p className="px-2.5 text-xs font-semibold text-muted">{children}</p>
}

/**
 * Gaveta de navegacao do mobile/tablet (abaixo de lg): categorias, atalhos de ajuda e conta.
 * Fecha com Esc, clique no fundo, ao navegar ou ao alargar a tela para o layout de desktop.
 */
export function HeaderMobileMenu({
  open,
  onClose,
  returnFocusRef,
}: {
  open: boolean
  onClose: () => void
  returnFocusRef?: RefObject<HTMLElement | null>
}) {
  const { user, isAdmin } = useAuth()
  const { whatsappUrl } = useSiteSettings()
  const { allCategories } = useHeaderCategories()
  const { isAllActive, isPromoActive, isCategoryActive } = useCatalogLinkState()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const returnTarget = returnFocusRef?.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus({ preventScroll: true })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return

      // Mantem o foco do teclado dentro da gaveta enquanto ela estiver aberta.
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const current = document.activeElement

      if (event.shiftKey && (current === first || !panelRef.current.contains(current))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (current === last || !panelRef.current.contains(current))) {
        event.preventDefault()
        first.focus()
      }
    }

    const desktop = window.matchMedia('(min-width: 1024px)')
    const onViewportChange = (event: MediaQueryListEvent) => {
      if (event.matches) onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    desktop.addEventListener('change', onViewportChange)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      desktop.removeEventListener('change', onViewportChange)
      returnTarget?.focus({ preventScroll: true })
    }
  }, [open, onClose, returnFocusRef])

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[60] lg:hidden',
        // Ao fechar, a visibilidade so muda depois da animacao de saida.
        open ? 'visible' : 'invisible transition-[visibility] duration-300',
      )}
      inert={!open}
    >
      <div
        className={cn(
          'absolute inset-0 bg-ink/40 transition-opacity duration-300 motion-reduce:transition-none',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={panelRef}
        id="header-mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={cn(
          'absolute inset-y-0 left-0 flex w-[min(88vw,360px)] flex-col bg-white shadow-soft',
          'transition-transform duration-300 ease-out motion-reduce:transition-none',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
          <StoreLogo size="sm" onClick={onClose} />
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Fechar menu"
            onClick={onClose}
            className="-mr-1.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
          >
            <X size={22} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-8 pt-4">
          {user ? (
            <Link
              to="/minha-conta"
              onClick={onClose}
              className="flex items-center gap-3 rounded-2xl border border-line p-3 transition-colors hover:border-[#D0D5DD] hover:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand" aria-hidden>
                <User size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">Minha conta</span>
                <span className="block truncate text-xs text-muted">Pedidos, endereços e favoritos</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
            </Link>
          ) : (
            <div className="rounded-2xl bg-surface p-4">
              <p className="text-sm font-semibold text-ink">Acesse sua conta</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">Acompanhe seus pedidos e salve seus favoritos.</p>
              <Link
                to="/login"
                onClick={onClose}
                className="mt-3 flex h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
              >
                Entrar ou cadastrar
              </Link>
            </div>
          )}

          <nav aria-label="Categorias" className="mt-6">
            <SectionTitle>Categorias</SectionTitle>
            <ul className="mt-2 grid gap-0.5">
              <li>
                <Link
                  to="/catalogo"
                  onClick={onClose}
                  aria-current={isAllActive ? 'page' : undefined}
                  className={rowClass(isAllActive)}
                >
                  <RowIcon icon={LayoutGrid} active={isAllActive} />
                  <span className="min-w-0 flex-1 truncate">Todos os produtos</span>
                </Link>
              </li>
              {allCategories.map((category) => {
                const active = isCategoryActive(category.name)
                return (
                  <li key={category.name}>
                    <Link
                      to={categoryCatalogPath(category.name)}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                      className={rowClass(active)}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-sand-soft">
                        {category.image ? (
                          <img
                            src={categoryThumbUrl(category.image)}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Grid3x3 size={16} className="text-muted" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{category.name}</span>
                      <ChevronRight size={16} className="shrink-0 text-muted/70" aria-hidden />
                    </Link>
                  </li>
                )
              })}
              <li>
                <Link
                  to={PROMO_CATALOG_PATH}
                  onClick={onClose}
                  aria-current={isPromoActive ? 'page' : undefined}
                  className={rowClass(isPromoActive, 'brand')}
                >
                  <RowIcon icon={Tag} active={isPromoActive} tone="brand" />
                  <span className="min-w-0 flex-1 truncate">Promoções</span>
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Ajuda" className="mt-5 border-t border-line pt-5">
            <SectionTitle>Ajuda e atalhos</SectionTitle>
            <ul className="mt-2 grid gap-0.5">
              <li>
                <Link to="/minha-conta/favoritos" onClick={onClose} className={rowClass()}>
                  <RowIcon icon={Heart} />
                  <span className="min-w-0 flex-1 truncate">Favoritos</span>
                </Link>
              </li>
              <li>
                <Link to="/rastrear-pedido" onClick={onClose} className={rowClass()}>
                  <RowIcon icon={PackageSearch} />
                  <span className="min-w-0 flex-1 truncate">Rastrear pedido</span>
                </Link>
              </li>
              <li>
                <a href={whatsappUrl} target="_blank" rel="noreferrer" onClick={onClose} className={rowClass()}>
                  <RowIcon icon={Headphones} />
                  <span className="min-w-0 flex-1 truncate">Atendimento</span>
                  <ArrowUpRight size={16} className="shrink-0 text-muted/70" aria-hidden />
                  <span className="sr-only">(abre o WhatsApp em nova aba)</span>
                </a>
              </li>
              {isAdmin && (
                <li>
                  <Link to="/admin" onClick={onClose} className={rowClass()}>
                    <RowIcon icon={Shield} />
                    <span className="min-w-0 flex-1 truncate">Admin</span>
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </div>
    </div>,
    document.body,
  )
}
