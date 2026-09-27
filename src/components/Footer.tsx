import { Link } from 'react-router-dom'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { StoreLogo } from './StoreLogo'

export function Footer() {
  const { settings } = useSiteSettings()

  return (
    <footer className="mt-16 bg-ink text-white">
      <div className="container grid gap-10 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <StoreLogo size="lg" />
          <p className="mt-5 max-w-md leading-relaxed text-gray-400">{settings.footer_about}</p>
          <p className="mt-3 text-sm font-medium text-brand">Loja de suplementos em Betim · MG</p>
          <p className="mt-1 text-sm text-gray-500">Atendemos Betim e enviamos para todo o Brasil</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Loja</h3>
          <div className="mt-4 grid gap-2.5 text-sm text-gray-400">
            <Link to="/catalogo" className="transition hover:text-brand">Catálogo</Link>
            <Link to="/carrinho" className="transition hover:text-brand">Carrinho</Link>
            <Link to="/minha-conta" className="transition hover:text-brand">Minha conta</Link>
            <Link to="/catalogo?sort=price-asc" className="text-brand transition hover:text-brand-hover">
              Promoções
            </Link>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Institucional</h3>
          <div className="mt-4 grid gap-2.5 text-sm text-gray-400">
            <Link to="/privacidade" className="transition hover:text-brand">Política de privacidade</Link>
            <Link to="/termos" className="transition hover:text-brand">Termos de uso</Link>
            <Link to="/trocas-devolucoes" className="transition hover:text-brand">Trocas e devoluções</Link>
            <span>{settings.support_email}</span>
            <span>{settings.footer_secure_text}</span>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container flex flex-col items-center gap-2 py-6 text-center text-xs text-gray-500">
          <p>
            © {new Date().getFullYear()} {settings.store_name} · Desenvolvido por{' '}
            <a
              href="https://matheusantao.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-brand transition hover:text-brand-hover hover:underline"
            >
              Matheus Antão
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
