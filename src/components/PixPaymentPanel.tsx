import { Check, Copy, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from './ui'
import { checkPaymentStatus } from '../services/mercadopago'

type PixData = {
  qrCode: string
  qrCodeBase64?: string
  ticketUrl?: string
}

/**
 * Tela de Pix com polling automatico do status no Mercado Pago.
 */
export function PixPaymentPanel({
  orderId,
  pix,
  onApproved,
  onClose,
}: {
  orderId: string
  pix: PixData
  onApproved: () => void
  onClose?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(false)
  const [statusLabel, setStatusLabel] = useState('Aguardando pagamento...')

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    const tick = async () => {
      try {
        const result = await checkPaymentStatus(orderId)
        if (cancelled) return
        if (result.orderStatus === 'aprovado') {
          setStatusLabel('Pagamento confirmado!')
          onApproved()
          return
        }
        if (result.orderStatus === 'recusado' || result.orderStatus === 'cancelado') {
          setStatusLabel('Pagamento nao aprovado.')
          return
        }
        setStatusLabel('Aguardando confirmacao do Pix...')
      } catch {
        if (!cancelled) setStatusLabel('Aguardando pagamento...')
      }
      if (!cancelled) {
        timer = window.setTimeout(() => void tick(), 4000)
      }
    }

    timer = window.setTimeout(() => void tick(), 2500)
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [orderId, onApproved])

  const copyPix = async () => {
    await navigator.clipboard.writeText(pix.qrCode)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2500)
  }

  const handleManualCheck = async () => {
    try {
      setChecking(true)
      const result = await checkPaymentStatus(orderId)
      if (result.orderStatus === 'aprovado') {
        setStatusLabel('Pagamento confirmado!')
        onApproved()
        return
      }
      setStatusLabel('Ainda nao identificamos o pagamento. Se ja pagou, aguarde alguns segundos.')
    } catch (error) {
      setStatusLabel(error instanceof Error ? error.message : 'Erro ao verificar')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="text-center">
      <p className="text-sm text-muted">
        Escaneie o QR Code no app do seu banco. A confirmacao e automatica.
      </p>
      {pix.qrCodeBase64 && (
        <img
          src={`data:image/png;base64,${pix.qrCodeBase64}`}
          alt="QR Code Pix"
          className="mx-auto mt-5 h-52 w-52 rounded-2xl border border-line sm:h-56 sm:w-56"
        />
      )}
      <button
        type="button"
        onClick={() => void copyPix()}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? 'Codigo copiado!' : 'Copiar codigo Pix'}
      </button>
      {pix.ticketUrl && (
        <a
          href={pix.ticketUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm font-semibold text-ink underline"
        >
          Abrir pagina do Pix
        </a>
      )}

      <p className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-ink">
        <LoaderCircle size={16} className="animate-spin text-brand" />
        {statusLabel}
      </p>

      <Button
        className="mt-4 w-full rounded-2xl"
        disabled={checking}
        onClick={() => void handleManualCheck()}
      >
        {checking ? (
          <>
            <LoaderCircle size={16} className="animate-spin" />
            Verificando...
          </>
        ) : (
          'Ja paguei — verificar agora'
        )}
      </Button>

      {onClose && (
        <Button variant="secondary" className="mt-2 w-full rounded-2xl" onClick={onClose}>
          Fechar
        </Button>
      )}
    </div>
  )
}
