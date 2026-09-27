import { CircleCheck, CircleX, Clock, type LucideIcon } from 'lucide-react'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import { CheckoutLinkButton } from '../components/CheckoutLinkButton'
import { useCart } from '../contexts/CartContext'
import { useSiteSettings } from '../contexts/SiteSettingsContext'

type StatusContent = {
  title: string
  description: string
  icon: LucideIcon
  iconClass: string
  secondary: { label: string; to: string }
}

const content: Record<'/checkout/sucesso' | '/checkout/falha' | '/checkout/pendente', StatusContent> = {
  '/checkout/sucesso': {
    title: 'Pagamento aprovado',
    description: 'Obrigado pela compra! Seu pedido já está sendo preparado para envio.',
    icon: CircleCheck,
    iconClass: 'bg-success/10 text-success',
    secondary: { label: 'Continuar comprando', to: '/catalogo' },
  },
  '/checkout/falha': {
    title: 'Pagamento recusado',
    description: 'Você pode tentar novamente pelo carrinho ou escolher outro meio de pagamento.',
    icon: CircleX,
    iconClass: 'bg-danger/10 text-danger',
    secondary: { label: 'Voltar ao carrinho', to: '/carrinho' },
  },
  '/checkout/pendente': {
    title: 'Pagamento pendente',
    description: 'Assim que o Mercado Pago confirmar, atualizaremos o seu pedido.',
    icon: Clock,
    iconClass: 'bg-brand-mint text-brand',
    secondary: { label: 'Continuar comprando', to: '/catalogo' },
  },
}

export function CheckoutStatusPage() {
  const location = useLocation()
  const { clearCart } = useCart()
  const { settings } = useSiteSettings()
  const { title, description, icon: Icon, iconClass, secondary } =
    content[location.pathname as keyof typeof content] ?? content['/checkout/pendente']

  useEffect(() => {
    if (location.pathname === '/checkout/sucesso') {
      clearCart()
      sessionStorage.removeItem('fitstore.pendingOrderId')
    }
  }, [clearCart, location.pathname])

  return (
    <>
      <Helmet>
        <title>{`${title} - ${settings.store_name}`}</title>
      </Helmet>
      <section className="container grid min-h-[60vh] place-items-center py-12 md:py-16">
        <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 text-center shadow-card sm:p-10">
          <span className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${iconClass}`}>
            <Icon size={28} aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
          <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted">{description}</p>
          <div className="mt-8 grid gap-3 sm:flex sm:justify-center">
            <CheckoutLinkButton to="/minha-conta/pedidos">Ver meus pedidos</CheckoutLinkButton>
            <CheckoutLinkButton to={secondary.to} variant="secondary">
              {secondary.label}
            </CheckoutLinkButton>
          </div>
        </div>
      </section>
    </>
  )
}
