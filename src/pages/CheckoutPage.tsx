import { Helmet } from 'react-helmet-async'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileText, LoaderCircle } from 'lucide-react'
import { AddressSelector } from '../components/AddressSelector'
import { MercadoPagoCardBrick } from '../components/MercadoPagoCardBrick'
import { PixPaymentPanel } from '../components/PixPaymentPanel'
import { Button, EmptyState, useToast } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { getAddressById } from '../services/addresses'
import { processPayment, type PaymentResult } from '../services/mercadopago'
import { calculateOrderTotal, calculatePixDiscount, createOrder } from '../services/orders'
import { supabase } from '../lib/supabase'
import { isStoreDemoMode, STORE_DEMO_MESSAGE } from '../lib/storeMode'
import { formatCurrency } from '../utils/format'
import { digitsOnly, isValidCpf, maskCpf } from '../utils/masks'

export function CheckoutPage() {
  if (isStoreDemoMode) {
    return (
      <section className="container py-10">
        <EmptyState title="Compras indisponíveis" description={STORE_DEMO_MESSAGE} />
        <div className="mt-6 flex justify-center">
          <Link to="/">
            <Button variant="secondary">Voltar para a loja</Button>
          </Link>
        </div>
      </section>
    )
  }

  return <CheckoutPageContent />
}

function CheckoutPageContent() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { settings } = useSiteSettings()
  const {
    items,
    subtotal,
    discount,
    coupon,
    shippingOptions,
    selectedShippingOption,
    calculateShipping,
    selectShippingOption,
    clearCart,
  } = useCart()
  const { notify } = useToast()
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [step, setStep] = useState<'address' | 'payment'>('address')
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao'>('pix')
  const [shippingLoading, setShippingLoading] = useState(false)
  const [paying, setPaying] = useState(false)
  const [cpf, setCpf] = useState('')
  const [pixResult, setPixResult] = useState<PaymentResult['pix']>(null)
  const [pixOrderId, setPixOrderId] = useState<string | null>(null)
  const [boletoUrl, setBoletoUrl] = useState<string | null>(null)
  const orderIdRef = useRef<string | null>(null)
  const shippingSelectionRef = useRef(0)

  const pixPercent = settings.pix_discount_enabled ? settings.pix_discount_percent : 0
  const hasFreeShipping =
    settings.free_shipping_enabled && subtotal >= settings.free_shipping_threshold
  const shipping = hasFreeShipping ? 0 : (selectedShippingOption?.price ?? 0)
  const pixDiscount =
    paymentMethod === 'pix' ? calculatePixDiscount(subtotal, discount, pixPercent) : 0
  const checkoutTotal = useMemo(
    () =>
      calculateOrderTotal({
        subtotal,
        couponDiscount: discount,
        pixDiscount,
        shipping,
      }),
    [discount, pixDiscount, shipping, subtotal],
  )

  useEffect(() => {
    if (!user) return
    void supabase
      .from('usuarios')
      .select('cpf')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.cpf) setCpf(maskCpf(data.cpf))
      })
  }, [user])

  useEffect(() => {
    orderIdRef.current = null
  }, [paymentMethod, checkoutTotal])

  const handlePixApproved = useCallback(() => {
    clearCart()
    notify('Pagamento Pix confirmado!', 'success')
    navigate('/checkout/sucesso')
  }, [clearCart, navigate, notify])

  const handleAddressSelect = async (addressId: string) => {
    const requestId = ++shippingSelectionRef.current
    setSelectedAddressId(addressId)
    if (!user) return
    try {
      setShippingLoading(true)
      const address = await getAddressById(addressId, user.id)
      if (requestId !== shippingSelectionRef.current) return
      const options = await calculateShipping(address.cep)
      if (requestId !== shippingSelectionRef.current) return
      if (options.length === 0) {
        notify('Nenhuma opcao de frete para este CEP', 'error')
      }
    } catch (error) {
      if (requestId === shippingSelectionRef.current) {
        notify(error instanceof Error ? error.message : 'Erro ao calcular frete', 'error')
      }
    } finally {
      if (requestId === shippingSelectionRef.current) setShippingLoading(false)
    }
  }

  if (!user) return <Navigate to="/login?redirect=/checkout" replace />

  if (pixResult && pixOrderId) {
    return (
      <section className="container grid min-h-[60vh] place-items-center py-12">
        <div className="w-full max-w-md rounded-3xl border border-line bg-white p-8 shadow-soft">
          <h1 className="text-center font-display text-2xl font-bold text-ink">Pague com Pix</h1>
          <div className="mt-4">
            <PixPaymentPanel
              orderId={pixOrderId}
              pix={pixResult}
              onApproved={handlePixApproved}
              onClose={() => navigate('/minha-conta/pedidos')}
            />
          </div>
          <p className="mt-2 text-center text-xs text-muted">
            Voce tambem pode acompanhar em{' '}
            <Link to="/minha-conta/pedidos" className="font-semibold underline">
              Meus pedidos
            </Link>
            .
          </p>
        </div>
      </section>
    )
  }

  if (boletoUrl) {
    return (
      <section className="container grid min-h-[60vh] place-items-center py-12">
        <div className="w-full max-w-md rounded-3xl border border-line bg-white p-8 text-center shadow-soft">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-ink">
            <FileText size={28} />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-ink">Boleto gerado</h1>
          <p className="mt-2 text-sm text-muted">
            O pedido sera confirmado em 1 a 2 dias uteis apos o pagamento do boleto.
          </p>
          <a href={boletoUrl} target="_blank" rel="noreferrer" className="mt-6 block">
            <Button className="w-full">Abrir boleto</Button>
          </a>
          <Link to="/minha-conta/pedidos" className="mt-4 inline-block text-sm font-semibold text-brand-hover">
            Ver meus pedidos
          </Link>
        </div>
      </section>
    )
  }

  if (items.length === 0) {
    return (
      <section className="container py-10">
        <EmptyState title="Carrinho vazio" description="Adicione produtos antes de finalizar." />
      </section>
    )
  }

  const goToPayment = () => {
    if (!selectedAddressId) {
      notify('Selecione ou cadastre um endereco de entrega', 'error')
      return
    }
    if (!selectedShippingOption) {
      notify('Aguarde o calculo do frete ou selecione uma opcao', 'error')
      return
    }
    if (!isValidCpf(cpf)) {
      notify('Informe um CPF valido para a NF / frete', 'error')
      return
    }
    setStep('payment')
  }

  const ensureOrder = async () => {
    if (orderIdRef.current) return orderIdRef.current
    if (!selectedAddressId || !selectedShippingOption) {
      throw new Error('Endereco e frete sao obrigatorios')
    }
    if (!isValidCpf(cpf)) {
      throw new Error('CPF invalido')
    }

    const order = await createOrder({
      items,
      paymentMethod,
      shippingOption: selectedShippingOption,
      total: checkoutTotal,
      couponCode: coupon?.codigo,
      addressId: selectedAddressId,
      cpf: digitsOnly(cpf),
    })
    orderIdRef.current = order.id
    sessionStorage.setItem('fitstore.pendingOrderId', order.id)
    return order.id
  }

  const applyPaymentResult = (result: PaymentResult, orderId: string) => {
    if (result.orderStatus === 'aprovado') {
      clearCart()
      navigate('/checkout/sucesso')
      return
    }

    if (result.pix) {
      setPixOrderId(orderId)
      setPixResult(result.pix)
      clearCart()
      return
    }

    if (result.boletoUrl) {
      setBoletoUrl(result.boletoUrl)
      clearCart()
      return
    }

    if (result.orderStatus === 'pendente') {
      clearCart()
      navigate('/checkout/pendente')
      return
    }

    notify('Pagamento nao aprovado. Verifique os dados e tente novamente.', 'error')
  }

  const handlePayPix = async () => {
    try {
      setPaying(true)
      const orderId = await ensureOrder()
      const result = await processPayment(orderId, {
        payment_method_id: 'pix',
        payer: {
          email: user.email,
        },
      })

      if (
        result.orderStatus === 'aprovado' ||
        result.pix ||
        result.boletoUrl ||
        result.orderStatus === 'pendente'
      ) {
        applyPaymentResult(result, orderId)
        return
      }

      notify('Nao foi possivel gerar o Pix. Tente novamente.', 'error')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao processar pagamento', 'error')
    } finally {
      setPaying(false)
    }
  }

  const handleCardBrickSubmit = async (formData: Record<string, unknown>) => {
    try {
      setPaying(true)
      const orderId = await ensureOrder()
      const result = await processPayment(orderId, formData)
      applyPaymentResult(result, orderId)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao processar pagamento', 'error')
      throw error
    } finally {
      setPaying(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Checkout - {settings.store_name}</title>
      </Helmet>
      <section className="container grid gap-8 py-10 lg:grid-cols-[1fr_380px]">
        <div className="rounded-3xl border border-line bg-white p-6 shadow-card md:p-8">
          <h1 className="font-display text-3xl font-bold text-ink">Checkout</h1>
          <p className="mt-2 text-sm text-muted">
            {step === 'address'
              ? 'Confirme endereco e frete para seguir ao pagamento.'
              : 'Escolha como deseja pagar. O pagamento e processado com seguranca no site.'}
          </p>

          {step === 'address' ? (
            <>
              <div className="mt-7">
                <h2 className="text-sm font-semibold text-ink">Endereco de entrega</h2>
                <div className="mt-4">
                  <AddressSelector
                    selectedAddressId={selectedAddressId}
                    onSelect={(addressId) => {
                      void handleAddressSelect(addressId)
                    }}
                  />
                </div>
              </div>

              <div className="mt-7">
                <h2 className="text-sm font-semibold text-ink">CPF do destinatario</h2>
                <p className="mt-1 text-xs text-muted">
                  Obrigatorio para emitir o frete (SuperFrete / declaracao de conteudo).
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(event) => setCpf(maskCpf(event.target.value))}
                  className="mt-3 w-full max-w-xs rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-ink"
                />
              </div>

              <div className="mt-7">
                <h2 className="text-sm font-semibold text-ink">Opcoes de frete</h2>
                {shippingLoading && <p className="mt-3 text-sm text-muted">Calculando frete...</p>}
                {!shippingLoading && shippingOptions.length === 0 && selectedAddressId && (
                  <p className="mt-3 text-sm text-amber-700">
                    Nenhuma opcao de frete disponivel para o CEP selecionado.
                  </p>
                )}
                <div className="mt-4 grid gap-2">
                  {shippingOptions.map((option) => (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-3 text-sm hover:border-ink"
                    >
                      <input
                        type="radio"
                        name="shipping"
                        checked={selectedShippingOption?.id === option.id}
                        onChange={() => selectShippingOption(option)}
                      />
                      <span className="grid flex-1 gap-1">
                        <strong className="text-ink">
                          {option.service} - {option.carrier}
                        </strong>
                        <span className="text-muted">Entrega em ate {option.deliveryTime} dias uteis</span>
                      </span>
                      <strong>{formatCurrency(option.price)}</strong>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                className="mt-7 w-full sm:w-auto"
                onClick={goToPayment}
                disabled={
                  !selectedAddressId || !selectedShippingOption || shippingLoading || !isValidCpf(cpf)
                }
              >
                Ir para o pagamento
              </Button>
            </>
          ) : (
            <div className="mt-7">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">Pagamento</h2>
                <button
                  type="button"
                  onClick={() => setStep('address')}
                  className="text-xs font-semibold text-muted hover:text-ink"
                >
                  Trocar endereco
                </button>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                    paymentMethod === 'pix' ? 'border-ink bg-surface' : 'border-line hover:border-ink/40'
                  }`}
                >
                  <span
                    className={`grid h-4 w-4 place-items-center rounded-full border ${
                      paymentMethod === 'pix' ? 'border-ink' : 'border-muted'
                    }`}
                  >
                    {paymentMethod === 'pix' && <span className="h-2 w-2 rounded-full bg-ink" />}
                  </span>
                  <span>
                    <strong className="text-ink">Pix</strong>
                    {pixPercent > 0 ? (
                      <span className="block text-sm text-green-700">{pixPercent}% de desconto</span>
                    ) : (
                      <span className="block text-sm text-muted">Pagamento instantaneo</span>
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cartao')}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                    paymentMethod === 'cartao' ? 'border-ink bg-surface' : 'border-line hover:border-ink/40'
                  }`}
                >
                  <span
                    className={`grid h-4 w-4 place-items-center rounded-full border ${
                      paymentMethod === 'cartao' ? 'border-ink' : 'border-muted'
                    }`}
                  >
                    {paymentMethod === 'cartao' && <span className="h-2 w-2 rounded-full bg-ink" />}
                  </span>
                  <span>
                    <strong className="text-ink">Cartao / Boleto</strong>
                    <span className="block text-sm text-muted">
                      {settings.installments_text || 'Parcelamento seguro no site'}
                    </span>
                  </span>
                </button>
              </div>

              {paymentMethod === 'pix' ? (
                <>
                  <div className="mt-6 rounded-2xl border border-line bg-[#f7f8f5] p-4 text-sm text-muted">
                    <p>
                      Ao confirmar, geramos o QR Code Pix na hora. Voce paga no app do banco e o pedido
                      atualiza automaticamente.
                    </p>
                  </div>
                  <Button
                    className="mt-6 w-full rounded-2xl"
                    disabled={paying}
                    onClick={() => void handlePayPix()}
                  >
                    {paying ? (
                      <>
                        <LoaderCircle size={16} className="animate-spin" />
                        Processando...
                      </>
                    ) : (
                      `Pagar ${formatCurrency(checkoutTotal)} com Pix`
                    )}
                  </Button>
                </>
              ) : (
                <div className="mt-6 rounded-2xl border border-line bg-white p-2 sm:p-4">
                  <p className="mb-3 px-2 text-sm text-muted">
                    Preencha os dados abaixo. O pagamento fica no site — sem redirecionar.
                  </p>
                  {paying && (
                    <p className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold text-ink">
                      <LoaderCircle size={16} className="animate-spin" />
                      Processando pagamento...
                    </p>
                  )}
                  <MercadoPagoCardBrick
                    amount={checkoutTotal}
                    payerEmail={user.email}
                    disabled={paying}
                    onError={(message) => notify(message, 'error')}
                    onSubmit={handleCardBrickSubmit}
                  />
                </div>
              )}
            </div>
          )}

          <p className="mt-6 text-xs text-muted">
            Ao finalizar, voce concorda com nossos{' '}
            <Link to="/termos" className="font-semibold underline">
              Termos de Uso
            </Link>{' '}
            e{' '}
            <Link to="/privacidade" className="font-semibold underline">
              Politica de Privacidade
            </Link>
            .
          </p>
        </div>

        <aside className="h-fit rounded-3xl border border-line bg-white p-6 shadow-soft">
          <h2 className="font-display text-xl font-bold text-ink">Resumo do pedido</h2>
          <div className="mt-5 grid gap-3">
            {items.map((item) => (
              <div
                key={`${item.product.id}:${item.flavor?.id ?? 'default'}`}
                className="flex justify-between gap-4 text-sm"
              >
                <span className="text-muted">
                  {item.quantity}x {item.product.nome}
                  {item.flavor ? ` (${item.flavor.nome})` : ''}
                </span>
                <strong className="text-ink">
                  {formatCurrency((item.product.preco_promocional ?? item.product.preco) * item.quantity)}
                </strong>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-line pt-4">
            <div className="mb-3 grid gap-2 text-sm text-muted">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Desconto cupom</span>
                <span>{formatCurrency(discount)}</span>
              </div>
              {pixDiscount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Desconto Pix ({pixPercent}%)</span>
                  <span>-{formatCurrency(pixDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Frete</span>
                <span>{selectedShippingOption ? formatCurrency(shipping) : 'A calcular'}</span>
              </div>
            </div>
            <div className="flex justify-between font-display text-lg font-bold text-ink">
              <span>Total</span>
              <span>{formatCurrency(checkoutTotal)}</span>
            </div>
          </div>
        </aside>
      </section>
    </>
  )
}
