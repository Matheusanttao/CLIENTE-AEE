import { initMercadoPago, Payment } from '@mercadopago/sdk-react'
import { CircleAlert, Info, LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined

let mpInitialized = false

function ensureMercadoPago() {
  if (!publicKey) throw new Error('VITE_MP_PUBLIC_KEY não configurada')
  if (!mpInitialized) {
    initMercadoPago(publicKey, { locale: 'pt-BR' })
    mpInitialized = true
  }
}

export type BrickFormData = Record<string, unknown>

type Props = {
  amount: number
  payerEmail?: string | null
  disabled?: boolean
  onSubmit: (formData: BrickFormData) => Promise<void>
  onError?: (message: string) => void
}

/**
 * Payment Brick embutido (cartao credito/debito + boleto) — sem sair do site.
 */
export function MercadoPagoCardBrick({ amount, payerEmail, disabled, onSubmit, onError }: Props) {
  const [ready, setReady] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)
  const submitting = useRef(false)

  useEffect(() => {
    try {
      ensureMercadoPago()
      setBootError(null)
    } catch (error) {
      setBootError(error instanceof Error ? error.message : 'Erro ao iniciar Mercado Pago')
    }
  }, [])

  const initialization = useMemo(
    () => ({
      amount: Math.round(amount * 100) / 100,
      payer: payerEmail ? { email: payerEmail } : undefined,
    }),
    [amount, payerEmail],
  )

  const customization = useMemo(
    () => ({
      paymentMethods: {
        creditCard: 'all' as const,
        debitCard: 'all' as const,
        ticket: 'all' as const,
        maxInstallments: 12,
      },
      visual: {
        style: {
          theme: 'default' as const,
          borderRadius: '16px',
        },
      },
    }),
    [],
  )

  if (bootError) {
    return (
      <p className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-ink">
        <CircleAlert size={18} className="mt-px shrink-0 text-danger" aria-hidden="true" />
        {bootError}
      </p>
    )
  }

  if (!publicKey) {
    return (
      <p className="flex items-start gap-2 rounded-xl border border-line bg-surface p-4 text-sm text-ink">
        <Info size={18} className="mt-px shrink-0 text-muted" aria-hidden="true" />
        Pagamento por cartão indisponível: chave pública do Mercado Pago ausente.
      </p>
    )
  }

  return (
    <div className={`relative min-h-[320px] ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      {!ready && (
        <p
          className="absolute inset-x-0 top-8 flex items-center justify-center gap-2 text-sm text-muted"
          role="status"
        >
          <LoaderCircle size={16} className="animate-spin text-brand" aria-hidden="true" />
          Carregando formulário de pagamento...
        </p>
      )}
      <Payment
        key={`mp-payment-${initialization.amount}-${payerEmail ?? ''}`}
        initialization={initialization}
        customization={customization}
        onReady={() => setReady(true)}
        onError={(error) => {
          const message =
            typeof error === 'object' && error && 'message' in error
              ? String((error as { message: unknown }).message)
              : 'Erro no formulário de pagamento'
          onError?.(message)
        }}
        onSubmit={async ({ formData }) => {
          if (submitting.current || disabled) return
          submitting.current = true
          try {
            await onSubmit(formData as unknown as BrickFormData)
          } finally {
            submitting.current = false
          }
        }}
      />
    </div>
  )
}
