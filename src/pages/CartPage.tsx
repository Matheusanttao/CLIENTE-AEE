import { Trash2 } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Button, EmptyState, Input, useToast } from '../components/ui'
import { useCart } from '../contexts/CartContext'
import { isStoreDemoMode, STORE_DEMO_MESSAGE } from '../lib/storeMode'
import { getCoupon } from '../services/orders'
import { formatCurrency } from '../utils/format'

export function CartPage() {
  const { items, subtotal, discount, total, updateQuantity, removeItem, applyCoupon, getLineKey } = useCart()
  const { notify } = useToast()

  const handleCoupon = async (formData: FormData) => {
    const code = String(formData.get('cupom') ?? '').trim()
    if (!code) return
    try {
      const coupon = await getCoupon(code)
      applyCoupon(coupon)
      notify('Cupom aplicado')
    } catch {
      notify('Cupom invalido ou expirado', 'error')
    }
  }

  if (items.length === 0) {
    return <section className="container py-10"><EmptyState title="Seu carrinho esta vazio" description="Adicione produtos para iniciar sua compra." /></section>
  }

  return (
    <>
      <Helmet>
        <title>Carrinho - Passarin Suplementos</title>
      </Helmet>
      <section className="container grid gap-8 py-10 lg:grid-cols-[1fr_380px]">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink">Carrinho</h1>
          <div className="mt-8 grid gap-4">
            {items.map((item) => {
              const lineKey = getLineKey(item)
              const maxStock = item.flavor?.estoque ?? item.product.estoque
              return (
              <article key={lineKey} className="grid gap-4 rounded-3xl border border-line bg-white p-4 shadow-card sm:grid-cols-[120px_1fr_auto]">
                <img
                  src={item.product.imagens_produtos?.[0]?.url}
                  alt={item.product.nome}
                  className="aspect-square rounded-2xl bg-surface object-cover"
                />
                <div>
                  <h2 className="font-semibold text-ink">{item.product.nome}</h2>
                  <p className="mt-1 text-sm text-muted">{item.product.marca}</p>
                  {item.flavor && (
                    <p className="mt-1 text-sm font-semibold text-ink">Sabor: {item.flavor.nome}</p>
                  )}
                  <p className="mt-4 font-bold text-ink">
                    {formatCurrency(item.product.preco_promocional ?? item.product.preco)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={maxStock}
                    value={item.quantity}
                    className="w-24"
                    onChange={(event) => {
                      const result = updateQuantity(lineKey, Number(event.target.value))
                      if (!result.success && result.message) notify(result.message, 'error')
                    }}
                  />
                  <Button variant="danger" onClick={() => removeItem(lineKey)} aria-label="Remover item">
                    <Trash2 size={18} />
                  </Button>
                </div>
              </article>
              )
            })}
          </div>
        </div>
        <aside className="h-fit rounded-3xl border border-line bg-white p-6 shadow-soft">
          <h2 className="font-display text-2xl font-bold text-ink">Resumo</h2>
          <form action={handleCoupon} className="mt-5 flex gap-2">
            <Input name="cupom" placeholder="Cupom" />
            <Button type="submit" variant="secondary">Aplicar</Button>
          </form>
          <div className="mt-6 grid gap-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div>
            <div className="flex justify-between"><span>Desconto</span><strong>{formatCurrency(discount)}</strong></div>
            <p className="text-xs text-muted">Frete e desconto Pix serao calculados no checkout.</p>
            <div className="border-t border-line pt-4 text-lg font-bold">
              <div className="flex justify-between"><span>Subtotal com desconto</span><span>{formatCurrency(total)}</span></div>
            </div>
          </div>
          {isStoreDemoMode ? (
            <div className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-50 p-4 text-sm font-medium text-ink">
              {STORE_DEMO_MESSAGE}
            </div>
          ) : (
            <Link to="/checkout" className="mt-6 block">
              <Button className="w-full">Prosseguir para checkout</Button>
            </Link>
          )}
        </aside>
      </section>
    </>
  )
}
