import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'

const content = {
  '/checkout/sucesso': [
    'Pagamento aprovado',
    'Obrigado pela compra. O vendedor ja esta preparando o seu pedido para envio.',
  ],
  '/checkout/falha': ['Pagamento recusado', 'Voce pode tentar novamente pelo carrinho ou escolher outro meio de pagamento.'],
  '/checkout/pendente': ['Pagamento pendente', 'Assim que o Mercado Pago confirmar, atualizaremos seu pedido.'],
}

export function CheckoutStatusPage() {
  const location = useLocation()
  const { clearCart } = useCart()
  const [title, description] = content[location.pathname as keyof typeof content] ?? content['/checkout/pendente']

  useEffect(() => {
    if (location.pathname === '/checkout/sucesso') {
      clearCart()
      sessionStorage.removeItem('fitstore.pendingOrderId')
    }
  }, [clearCart, location.pathname])

  return (
    <section className="container grid min-h-[60vh] place-items-center py-10">
      <div className="max-w-xl rounded-3xl border border-line bg-white p-8 text-center shadow-soft">
        <h1 className="font-display text-3xl font-bold text-ink">{title}</h1>
        <p className="mt-3 text-muted">{description}</p>
        <Link
          to="/minha-conta/pedidos"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-ink shadow-brand transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-hover active:translate-y-0"
        >
          Ver meus pedidos
        </Link>
      </div>
    </section>
  )
}
