import { Mail, MessageCircle, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { StoreLogo } from './StoreLogo'

const currentYear = new Date().getFullYear()

const storeLinks = [
  { label: 'Catálogo', to: '/catalogo' },
  { label: 'Carrinho', to: '/carrinho' },
  { label: 'Minha conta', to: '/minha-conta' },
  { label: 'Promoções', to: '/catalogo?sort=price-asc' },
  { label: 'Favoritos', to: '/minha-conta/favoritos' },
]

const institutionalLinks = [
  { label: 'Política de privacidade', to: '/privacidade' },
  { label: 'Termos de uso', to: '/termos' },
  { label: 'Trocas e devoluções', to: '/trocas-devolucoes' },
  { label: 'Rastrear pedido', to: '/rastrear-pedido' },
]

const linkClass =
  'inline-flex min-h-10 items-center text-sm text-muted transition-colors hover:text-brand focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 lg:min-h-9'

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-ink">{title}</h3>
      <ul className="mt-3 grid gap-0.5">{children}</ul>
    </div>
  )
}

export function Footer() {
  const { settings, whatsappUrl } = useSiteSettings()
  const supportEmail = settings.support_email?.trim()
  const hasWhatsapp = Boolean(settings.whatsapp_number?.trim())
  const secureText = settings.footer_secure_text?.trim()

  return (
    <footer className="mt-16 border-t border-line bg-surface md:mt-24">
      <div className="container grid gap-10 py-12 sm:grid-cols-2 md:py-16 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-12">
        <div className="sm:col-span-2 lg:col-span-1">
          <StoreLogo size="lg" className="w-fit" />
          {settings.footer_about && (
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted">{settings.footer_about}</p>
          )}
          {settings.store_tagline && (
            <p className="mt-4 inline-flex rounded-full bg-brand px-3 py-1 text-xs font-bold text-white shadow-brand">
              {settings.store_tagline}
            </p>
          )}
        </div>

        <FooterColumn title="Loja">
          {storeLinks.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className={linkClass}>
                {link.label}
              </Link>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Institucional">
          {institutionalLinks.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className={linkClass}>
                {link.label}
              </Link>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Atendimento">
          {supportEmail && (
            <li>
              <a href={`mailto:${supportEmail}`} className={`${linkClass} group min-w-0 gap-2.5`}>
                <Mail size={16} className="shrink-0 text-muted transition-colors group-hover:text-brand" />
                <span className="min-w-0 break-all">{supportEmail}</span>
              </a>
            </li>
          )}
          {hasWhatsapp && (
            <li>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkClass} group gap-2.5`}
              >
                <MessageCircle size={16} className="shrink-0 text-muted transition-colors group-hover:text-brand" />
                Fale pelo WhatsApp
              </a>
            </li>
          )}
          {secureText && (
            <li className="mt-3 flex items-start gap-2.5 rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink-soft shadow-sm">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand" />
              <span>{secureText}</span>
            </li>
          )}
        </FooterColumn>
      </div>

      <div className="border-t border-line">
        <div className="container flex flex-col gap-2 py-6 text-center text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>
            © {currentYear} {settings.store_name}. Todos os direitos reservados.
          </p>
          <p>
            Desenvolvido por{' '}
            <a
              href="https://matheusantao.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ink-soft transition-colors hover:text-brand"
            >
              Matheus Antão
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
