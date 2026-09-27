import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  Check,
  ChevronLeft,
  CircleAlert,
  CreditCard,
  ExternalLink,
  FileText,
  ImageOff,
  LoaderCircle,
  Lock,
  QrCode,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import { AddressSelector } from '../components/AddressSelector'
import { CheckoutAnchorButton, CheckoutLinkButton } from '../components/CheckoutLinkButton'
import { MercadoPagoCardBrick } from '../components/MercadoPagoCardBrick'
import { PixPaymentPanel } from '../components/PixPaymentPanel'
import { Button, EmptyState, Input, Skeleton, useToast } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { optimizeCloudinaryUrl } from '../lib/cloudinary'
import { getAddressById, getMyAddresses } from '../services/addresses'
import { processPayment, type PaymentResult } from '../services/mercadopago'
import { calculateOrderTotal, calculatePixDiscount, createOrder } from '../services/orders'
import { supabase } from '../lib/supabase'
import { isStoreDemoMode, STORE_DEMO_MESSAGE } from '../lib/storeMode'
import { cn } from '../utils/cn'
import { formatAddressLine, formatCep, formatCurrency } from '../utils/format'
import { digitsOnly, isValidCpf, maskCpf } from '../utils/masks'

const cardClass = 'rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6'
const subsectionTitle = 'text-base font-semibold text-ink'
const textLink = 'font-semibold text-brand transition-colors hover:text-brand-hover'

type StepState = 'current' | 'done' | 'pending'

function StepHeading({
  number,
  title,
  description,
  state,
  action,
}: {
  number: number
  title: string
  description?: string
  state: StepState
  action?: ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className={cn(
          'grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-semibold',
          state === 'pending' ? 'bg-surface text-muted' : 'bg-brand text-white',
        )}
      >
        {state === 'done' ? <Check size={15} strokeWidth={3} /> : number}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className={cn('text-lg font-semibold leading-7', state === 'pending' ? 'text-muted' : 'text-ink')}>
          <span className="sr-only">Etapa {number}: </span>
          {title}
          {state === 'done' && <span className="sr-only"> (concluída)</span>}
        </h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 bg-white transition',
        selected ? 'border-brand' : 'border-[#D0D5DD]',
      )}
    >
      {selected && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
    </span>
  )
}

function PaymentTab({
  active,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  active: boolean
  icon: LucideIcon
  label: string
  badge?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-[13px] font-semibold transition sm:px-3 sm:text-sm',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20',
        active ? 'bg-white text-ink shadow-card' : 'text-muted hover:text-ink',
      )}
    >
      <Icon size={16} className={cn('hidden shrink-0 sm:block', active && 'text-brand')} aria-hidden="true" />
      <span className="whitespace-nowrap">{label}</span>
      {badge && (
        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-hover">
          {badge}
        </span>
      )}
    </button>
  )
}

export function CheckoutPage() {
  if (isStoreDemoMode) {
    return (
      <section className="container py-12 md:py-16">
        <EmptyState title="Compras indisponíveis" description={STORE_DEMO_MESSAGE} />
        <div className="mt-6 flex justify-center">
          <CheckoutLinkButton to="/" variant="secondary">
            Voltar para a loja
          </CheckoutLinkButton>
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
  // Mesma query (e cache) do AddressSelector: so usada para mostrar o endereco no resumo da etapa 1.
  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: () => getMyAddresses(user?.id ?? ''),
    enabled: Boolean(user),
  })
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) ?? null

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
        notify('Nenhuma opção de frete para este CEP', 'error')
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
      <section className="container grid min-h-[60vh] place-items-center py-12 md:py-16">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white p-5 shadow-card sm:p-8">
          <div className="text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-mint text-brand">
              <QrCode size={26} aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">Pague com Pix</h1>
          </div>
          <div className="mt-4">
            <PixPaymentPanel
              orderId={pixOrderId}
              pix={pixResult}
              onApproved={handlePixApproved}
              onClose={() => navigate('/minha-conta/pedidos')}
            />
          </div>
          <p className="mt-5 border-t border-line pt-4 text-center text-xs text-muted">
            Você também pode acompanhar em{' '}
            <Link to="/minha-conta/pedidos" className={textLink}>
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
      <section className="container grid min-h-[60vh] place-items-center py-12 md:py-16">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 text-center shadow-card sm:p-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-mint text-brand">
            <FileText size={26} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">Boleto gerado</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            O pedido será confirmado em 1 a 2 dias úteis após o pagamento do boleto.
          </p>
          <CheckoutAnchorButton href={boletoUrl} target="_blank" rel="noreferrer" className="mt-6 w-full">
            Abrir boleto
            <ExternalLink size={16} aria-hidden="true" />
          </CheckoutAnchorButton>
          <Link
            to="/minha-conta/pedidos"
            className={cn('mt-3 inline-flex min-h-10 items-center text-sm', textLink)}
          >
            Ver meus pedidos
          </Link>
        </div>
      </section>
    )
  }

  if (items.length === 0) {
    return (
      <section className="container py-12 md:py-16">
        <EmptyState title="Carrinho vazio" description="Adicione produtos antes de finalizar a compra." />
        <div className="mt-6 flex justify-center">
          <CheckoutLinkButton to="/catalogo">Ver produtos</CheckoutLinkButton>
        </div>
      </section>
    )
  }

  const goToPayment = () => {
    if (!selectedAddressId) {
      notify('Selecione ou cadastre um endereço de entrega', 'error')
      return
    }
    if (!selectedShippingOption) {
      notify('Aguarde o cálculo do frete ou selecione uma opção', 'error')
      return
    }
    if (!isValidCpf(cpf)) {
      notify('Informe um CPF válido para a NF / frete', 'error')
      return
    }
    setStep('payment')
  }

  const ensureOrder = async () => {
    if (orderIdRef.current) return orderIdRef.current
    if (!selectedAddressId || !selectedShippingOption) {
      throw new Error('Endereço e frete são obrigatórios')
    }
    if (!isValidCpf(cpf)) {
      throw new Error('CPF inválido')
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

    notify('Pagamento não aprovado. Verifique os dados e tente novamente.', 'error')
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

      notify('Não foi possível gerar o Pix. Tente novamente.', 'error')
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

  const continueDisabled =
    !selectedAddressId || !selectedShippingOption || shippingLoading || !isValidCpf(cpf)
  const cpfInvalid = digitsOnly(cpf).length === 11 && !isValidCpf(cpf)

  return (
    <>
      <Helmet>
        <title>{`Finalizar compra - ${settings.store_name}`}</title>
      </Helmet>
      <section className="container py-8 md:py-12">
        <Link
          to="/carrinho"
          className="-ml-1 inline-flex min-h-10 items-center gap-1 rounded-lg px-1 text-sm font-medium text-muted transition-colors hover:text-brand"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Voltar ao carrinho
        </Link>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Finalizar compra</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          {step === 'address'
            ? 'Confirme o endereço e o frete para seguir ao pagamento.'
            : 'Escolha como deseja pagar. O pagamento é processado com segurança no site.'}
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
          <div className="grid min-w-0 gap-5">
            {step === 'address' ? (
              <>
                <div className={cardClass}>
                  <StepHeading
                    number={1}
                    title="Entrega"
                    state="current"
                    description="Endereço, CPF do destinatário e forma de envio."
                  />

                  <div className="mt-6 grid gap-6 sm:pl-10">
                    <div>
                      <h3 className={subsectionTitle}>Endereço de entrega</h3>
                      <div className="mt-3">
                        <AddressSelector
                          selectedAddressId={selectedAddressId}
                          onSelect={(addressId) => {
                            void handleAddressSelect(addressId)
                          }}
                        />
                      </div>
                    </div>

                    <div className="border-t border-line pt-6">
                      <label htmlFor="checkout-cpf" className={cn('block', subsectionTitle)}>
                        CPF do destinatário
                      </label>
                      <p id="checkout-cpf-hint" className="mt-1 text-sm text-muted">
                        Obrigatório para emitir o frete e a declaração de conteúdo.
                      </p>
                      <Input
                        id="checkout-cpf"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(event) => setCpf(maskCpf(event.target.value))}
                        aria-invalid={cpfInvalid}
                        aria-describedby={cpfInvalid ? 'checkout-cpf-hint checkout-cpf-error' : 'checkout-cpf-hint'}
                        className="mt-3 max-w-xs tabular-nums aria-[invalid=true]:border-danger"
                      />
                      {cpfInvalid && (
                        <p id="checkout-cpf-error" className="mt-1.5 text-xs font-medium text-danger">
                          CPF inválido. Confira os números digitados.
                        </p>
                      )}
                    </div>

                    <div className="border-t border-line pt-6">
                      <h3 className={subsectionTitle}>Frete</h3>
                      {!selectedAddressId && !shippingLoading && (
                        <p className="mt-1 text-sm text-muted">Selecione um endereço para calcular o frete.</p>
                      )}
                      {hasFreeShipping && selectedAddressId && !shippingLoading && shippingOptions.length > 0 && (
                        <p className="mt-1 flex items-center gap-2 text-sm font-medium text-ink">
                          <Truck size={16} className="shrink-0 text-brand" aria-hidden="true" />
                          Seu pedido tem frete grátis.
                        </p>
                      )}

                      {shippingLoading && (
                        <div className="mt-3 grid gap-3" role="status">
                          <p className="flex items-center gap-2 text-sm text-muted">
                            <LoaderCircle size={16} className="animate-spin text-brand" aria-hidden="true" />
                            Calculando frete...
                          </p>
                          <Skeleton className="h-[72px]" />
                          <Skeleton className="h-[72px]" />
                        </div>
                      )}

                      {!shippingLoading && shippingOptions.length === 0 && selectedAddressId && (
                        <p className="mt-3 flex items-start gap-2 rounded-xl border border-line bg-surface p-4 text-sm text-ink">
                          <CircleAlert size={18} className="mt-px shrink-0 text-muted" aria-hidden="true" />
                          Nenhuma opção de frete disponível para o CEP selecionado.
                        </p>
                      )}

                      {!shippingLoading && shippingOptions.length > 0 && (
                        <div className="mt-3 grid gap-3" role="radiogroup" aria-label="Opções de frete">
                          {shippingOptions.map((option) => {
                            const selected = selectedShippingOption?.id === option.id
                            return (
                              <label
                                key={option.id}
                                className={cn(
                                  'flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-sm transition',
                                  'has-[input:focus-visible]:ring-4 has-[input:focus-visible]:ring-brand/20',
                                  selected
                                    ? 'border-brand bg-brand-mint/40 ring-2 ring-brand/15'
                                    : 'border-line bg-white hover:border-[#D0D5DD]',
                                )}
                              >
                                <input
                                  type="radio"
                                  name="shipping"
                                  className="sr-only"
                                  checked={selected}
                                  onChange={() => selectShippingOption(option)}
                                />
                                <RadioDot selected={selected} />
                                <span className="min-w-0 flex-1">
                                  <span className="block font-semibold text-ink">
                                    {option.service} · {option.carrier}
                                  </span>
                                  <span className="mt-0.5 block text-muted">
                                    Entrega em até {option.deliveryTime} dias úteis
                                  </span>
                                </span>
                                <span className="shrink-0 text-right tabular-nums">
                                  {hasFreeShipping ? (
                                    <>
                                      <span className="block text-xs text-muted line-through">
                                        {formatCurrency(option.price)}
                                      </span>
                                      <span className="font-bold text-brand">Grátis</span>
                                    </>
                                  ) : (
                                    <span className="font-bold text-ink">{formatCurrency(option.price)}</span>
                                  )}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted">
                        {continueDisabled
                          ? 'Preencha endereço, CPF e frete para continuar.'
                          : 'Tudo certo. Agora é só escolher como pagar.'}
                      </p>
                      <Button className="w-full shrink-0 sm:w-auto" onClick={goToPayment} disabled={continueDisabled}>
                        Continuar para o pagamento
                        <ArrowRight size={16} aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className={cardClass}>
                  <StepHeading
                    number={2}
                    title="Pagamento"
                    state="pending"
                    description="Disponível após confirmar a entrega."
                  />
                </div>
              </>
            ) : (
              <>
                <div className={cardClass}>
                  <StepHeading
                    number={1}
                    title="Entrega"
                    state="done"
                    action={
                      <button
                        type="button"
                        onClick={() => setStep('address')}
                        aria-label="Alterar endereço e frete"
                        className={cn(
                          '-mr-2 -mt-1.5 inline-flex min-h-10 items-center rounded-xl px-3 text-sm',
                          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20',
                          textLink,
                        )}
                      >
                        Alterar
                      </button>
                    }
                  />
                  <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 sm:pl-10">
                    {selectedAddress && (
                      <div className="min-w-0 sm:col-span-2">
                        <dt className="text-muted">Endereço de entrega</dt>
                        <dd className="mt-0.5 font-medium text-ink">{selectedAddress.nome_destinatario}</dd>
                        <dd className="leading-relaxed text-muted">
                          {formatAddressLine(selectedAddress)} · CEP {formatCep(selectedAddress.cep)}
                        </dd>
                      </div>
                    )}
                    {selectedShippingOption && (
                      <div>
                        <dt className="text-muted">Frete</dt>
                        <dd className="mt-0.5 font-medium text-ink">
                          {selectedShippingOption.service} · {selectedShippingOption.carrier}
                        </dd>
                        <dd className="text-muted">
                          {shipping === 0 ? 'Grátis' : formatCurrency(shipping)} · até{' '}
                          {selectedShippingOption.deliveryTime} dias úteis
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-muted">CPF do destinatário</dt>
                      <dd className="mt-0.5 font-medium text-ink tabular-nums">{cpf}</dd>
                    </div>
                  </dl>
                </div>

                <div className={cardClass}>
                  <StepHeading number={2} title="Pagamento" state="current" />

                  <div className="mt-5 sm:pl-10">
                    <div
                      role="group"
                      aria-label="Forma de pagamento"
                      className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1"
                    >
                      <PaymentTab
                        active={paymentMethod === 'pix'}
                        icon={QrCode}
                        label="Pix"
                        badge={pixPercent > 0 ? `-${pixPercent}%` : undefined}
                        onClick={() => setPaymentMethod('pix')}
                      />
                      <PaymentTab
                        active={paymentMethod === 'cartao'}
                        icon={CreditCard}
                        label="Cartão / Boleto"
                        onClick={() => setPaymentMethod('cartao')}
                      />
                    </div>

                    {paymentMethod === 'pix' ? (
                      <div className="mt-5">
                        <div className="rounded-xl bg-surface p-4 text-sm leading-relaxed text-muted">
                          <p>
                            Ao confirmar, geramos o QR Code Pix na hora. Você paga no app do banco e o pedido é
                            atualizado automaticamente.
                          </p>
                          {pixDiscount > 0 && (
                            <p className="mt-2 font-medium text-ink">
                              Pagando com Pix você economiza {formatCurrency(pixDiscount)} ({pixPercent}% de desconto).
                            </p>
                          )}
                        </div>
                        <Button className="mt-5 w-full" disabled={paying} onClick={() => void handlePayPix()}>
                          {paying ? (
                            <>
                              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                              Processando...
                            </>
                          ) : (
                            <>
                              <QrCode size={16} aria-hidden="true" />
                              {`Pagar ${formatCurrency(checkoutTotal)} com Pix`}
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-5">
                        <p className="text-sm leading-relaxed text-muted">
                          Cartão de crédito, débito ou boleto. Preencha os dados abaixo: o pagamento é feito aqui
                          mesmo, sem redirecionamento.
                        </p>
                        {settings.installments_text && (
                          <p className="mt-1 text-sm font-medium text-ink">{settings.installments_text}</p>
                        )}
                        {paying && (
                          <p
                            role="status"
                            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-brand-mint px-4 py-3 text-sm font-medium text-ink"
                          >
                            <LoaderCircle size={16} className="animate-spin text-brand" aria-hidden="true" />
                            Processando pagamento...
                          </p>
                        )}
                        <div className="mt-4">
                          <MercadoPagoCardBrick
                            amount={checkoutTotal}
                            payerEmail={user.email}
                            disabled={paying}
                            onError={(message) => notify(message, 'error')}
                            onSubmit={handleCardBrickSubmit}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <p className="px-1 text-xs leading-relaxed text-muted">
              Ao finalizar, você concorda com nossos{' '}
              <Link to="/termos" className={textLink}>
                Termos de Uso
              </Link>{' '}
              e{' '}
              <Link to="/privacidade" className={textLink}>
                Política de Privacidade
              </Link>
              .
            </p>
          </div>

          <aside className="lg:sticky lg:top-36">
            <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-ink">Resumo do pedido</h2>
                <Link
                  to="/carrinho"
                  className={cn('-mr-2 inline-flex min-h-10 items-center rounded-xl px-2 text-sm', textLink)}
                >
                  Editar
                </Link>
              </div>

              <ul className="mt-4 grid gap-4 lg:max-h-72 lg:overflow-y-auto lg:pr-1 lg:pt-1.5">
                {items.map((item) => {
                  const cover = [...(item.product.imagens_produtos ?? [])].sort((a, b) => a.ordem - b.ordem)[0]
                  return (
                    <li
                      key={`${item.product.id}:${item.flavor?.id ?? 'default'}`}
                      className="flex items-center gap-3"
                    >
                      <span className="relative h-14 w-14 shrink-0 rounded-xl bg-surface">
                        {cover ? (
                          <img
                            src={optimizeCloudinaryUrl(cover.url, 160)}
                            alt={cover.alt || item.product.nome}
                            loading="lazy"
                            className="h-full w-full rounded-xl object-contain p-1 mix-blend-multiply"
                          />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-muted/60">
                            <ImageOff size={18} aria-hidden="true" />
                          </span>
                        )}
                        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-muted px-1 text-[11px] font-semibold text-white tabular-nums">
                          <span className="sr-only">Quantidade: </span>
                          {item.quantity}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium leading-snug text-ink">{item.product.nome}</p>
                        {item.flavor && <p className="mt-0.5 text-xs text-muted">Variação: {item.flavor.nome}</p>}
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-ink tabular-nums">
                        {formatCurrency((item.product.preco_promocional ?? item.product.preco) * item.quantity)}
                      </p>
                    </li>
                  )
                })}
              </ul>

              <dl className="mt-5 grid gap-2.5 border-t border-line pt-5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="font-medium text-ink tabular-nums">{formatCurrency(subtotal)}</dd>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">
                      Desconto do cupom{coupon?.codigo ? ` (${coupon.codigo})` : ''}
                    </dt>
                    <dd className="font-medium text-brand tabular-nums">-{formatCurrency(discount)}</dd>
                  </div>
                )}
                {pixDiscount > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Desconto Pix ({pixPercent}%)</dt>
                    <dd className="font-medium text-brand tabular-nums">-{formatCurrency(pixDiscount)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Frete</dt>
                  <dd className={cn('font-medium tabular-nums', shipping === 0 && selectedShippingOption ? 'text-brand' : 'text-ink')}>
                    {selectedShippingOption ? (shipping === 0 ? 'Grátis' : formatCurrency(shipping)) : 'A calcular'}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-4">
                <span className="text-base font-semibold text-ink">Total</span>
                <span className="text-xl font-bold text-ink tabular-nums">{formatCurrency(checkoutTotal)}</span>
              </div>

              {settings.footer_secure_text && (
                <p className="mt-5 flex items-center justify-center gap-1.5 rounded-xl bg-surface px-3 py-2.5 text-xs text-muted">
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
