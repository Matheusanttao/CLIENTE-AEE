import { CreditCard, Info, Lock, QrCode, ShoppingBag, Tag, Truck } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { CartLineItem } from '../components/CartLineItem'
import { CheckoutLinkButton } from '../components/CheckoutLinkButton'
import { Button, EmptyState, Input, useToast } from '../components/ui'
import { useCart } from '../contexts/CartContext'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { isStoreDemoMode, STORE_DEMO_MESSAGE } from '../lib/storeMode'
import { getCoupon } from '../services/orders'
import { formatCurrency } from '../utils/format'

export function CartPage() {
  const { items, subtotal, discount, total, coupon, updateQuantity, removeItem, applyCoupon, getLineKey } = useCart()
  const { settings } = useSiteSettings()
  const { notify } = useToast()
  const pageTitle = `Carrinho - ${settings.store_name}`

  const handleCoupon = async (formData: FormData) => {
    const code = String(formData.get('cupom') ?? '').trim()
    if (!code) return
    try {
      const coupon = await getCoupon(code)
      applyCoupon(coupon)
      notify('Cupom aplicado')
    } catch {
      notify('Cupom inválido ou expirado', 'error')
    }
  }

  if (items.length === 0) {
    return (
      <>
        <Helmet>
          <title>{pageTitle}</title>
        </Helmet>
        <section className="container py-12 md:py-16">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Carrinho</h1>
          <div className="mt-8">
            <EmptyState
              title="Seu carrinho está vazio"
              description="Explore os tênis e perfumes da loja e adicione seus favoritos para iniciar a compra."
            />
          </div>
          <div className="mt-6 flex justify-center">
            <CheckoutLinkButton to="/catalogo">
              <ShoppingBag size={18} aria-hidden="true" />
              Ver produtos
            </CheckoutLinkButton>
          </div>
        </section>
      </>
    )
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  // Mesma regra do checkout: frete gratis quando o subtotal atinge o valor configurado.
  const showFreeShipping = settings.free_shipping_enabled && settings.free_shipping_threshold > 0
  const freeShippingRemaining = Math.max(settings.free_shipping_threshold - subtotal, 0)
  const freeShippingProgress = showFreeShipping
    ? Math.min(subtotal / settings.free_shipping_threshold, 1) * 100
    : 0
  const pixPercent = settings.pix_discount_enabled ? settings.pix_discount_percent : 0
  const couponBelowMinimum = Boolean(coupon) && discount === 0 && subtotal < (coupon?.valor_minimo ?? 0)

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      <section className="container py-8 md:py-12">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Carrinho</h1>
        <p className="mt-2 text-[15px] text-muted">
          {itemCount === 1 ? '1 item' : `${itemCount} itens`} no seu carrinho
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            <ul className="divide-y divide-line">
              {items.map((item) => {
                const lineKey = getLineKey(item)
                const maxStock = item.flavor?.estoque ?? item.product.estoque
                return (
                  <li key={lineKey} className="p-4 sm:p-6">
                    <CartLineItem
                      item={item}
                      maxStock={maxStock}
                      onQuantityChange={(quantity) => {
                        const result = updateQuantity(lineKey, quantity)
                        if (!result.success && result.message) notify(result.message, 'error')
                        return result.success
                      }}
                      onRemove={() => removeItem(lineKey)}
                    />
                  </li>
                )
              })}
            </ul>
          </div>

          <aside className="lg:sticky lg:top-36">
            <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
              <h2 className="text-lg font-semibold text-ink">Resumo do pedido</h2>

              {showFreeShipping && (
                <div className="mt-5">
                  <p className="flex items-start gap-2 text-sm text-ink">
                    <Truck size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                    {freeShippingRemaining > 0 ? (
                      <span>
                        Faltam <strong className="font-semibold">{formatCurrency(freeShippingRemaining)}</strong> para
                        ganhar frete grátis.
                      </span>
                    ) : (
                      <span className="font-medium">Seu pedido tem frete grátis.</span>
                    )}
                  </p>
                  <div
                    className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface"
                    role="progressbar"
                    aria-label="Progresso para frete grátis"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(freeShippingProgress)}
                  >
                    <div
                      className="h-full rounded-full bg-brand transition-[width] duration-500"
                      style={{ width: `${freeShippingProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <form action={handleCoupon} className="mt-6">
                <label htmlFor="cart-coupon" className="text-sm font-medium text-ink">
                  Cupom de desconto
                </label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    id="cart-coupon"
                    name="cupom"
                    placeholder="Digite o código"
                    autoComplete="off"
                    className="min-w-0"
                  />
                  <Button type="submit" variant="secondary" className="shrink-0">
                    Aplicar
                  </Button>
                </div>
                {coupon && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                    <Tag size={14} className="shrink-0 text-brand" aria-hidden="true" />
                    <span>
                      Cupom <strong className="font-semibold text-ink">{coupon.codigo}</strong>
                      {couponBelowMinimum
                        ? ` válido para compras a partir de ${formatCurrency(coupon.valor_minimo)}.`
                        : ' aplicado.'}
                    </span>
                  </p>
                )}
              </form>

              <dl className="mt-6 grid gap-3 border-t border-line pt-5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="font-medium text-ink tabular-nums">{formatCurrency(subtotal)}</dd>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Desconto do cupom</dt>
                    <dd className="font-medium text-brand tabular-nums">-{formatCurrency(discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Frete</dt>
                  <dd className="text-right text-muted">Calculado no checkout</dd>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-line pt-4">
                  <dt className="text-base font-semibold text-ink">Total</dt>
                  <dd className="text-xl font-bold text-ink tabular-nums">{formatCurrency(total)}</dd>
                </div>
              </dl>

              {(pixPercent > 0 || settings.installments_text) && (
                <ul className="mt-4 grid gap-2 rounded-xl bg-surface p-3.5 text-xs text-muted">
                  {pixPercent > 0 && (
                    <li className="flex items-center gap-2">
                      <QrCode size={16} className="shrink-0 text-ink" aria-hidden="true" />
                      <span>
                        <strong className="font-semibold text-ink">{pixPercent}% de desconto</strong> pagando com Pix
                      </span>
                    </li>
                  )}
                  {settings.installments_text && (
                    <li className="flex items-center gap-2">
                      <CreditCard size={16} className="shrink-0 text-ink" aria-hidden="true" />
                      <span>{settings.installments_text}</span>
                    </li>
                  )}
                </ul>
              )}

              <div className="mt-6 grid gap-3">
                {isStoreDemoMode ? (
                  <p className="flex items-start gap-2 rounded-xl border border-line bg-surface p-4 text-sm text-ink">
                    <Info size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
                    {STORE_DEMO_MESSAGE}
                  </p>
                ) : (
                  <CheckoutLinkButton to="/checkout" className="w-full">
                    Finalizar compra
                  </CheckoutLinkButton>
                )}
                <CheckoutLinkButton to="/catalogo" variant="secondary" className="w-full">
                  Continuar comprando
                </CheckoutLinkButton>
              </div>

              {settings.footer_secure_text && (
                <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted">
                  <Lock size={14} aria-hidden="true" />
                  {settings.footer_secure_text}
                </p>
              )}
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
