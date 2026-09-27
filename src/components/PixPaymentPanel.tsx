import { Check, CircleAlert, CircleCheck, Copy, ExternalLink, LoaderCircle } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Button } from './ui'
import { checkPaymentStatus } from '../services/mercadopago'

type PixData = {
  qrCode: string
  qrCodeBase64?: string
  ticketUrl?: string
}

const STATUS_APPROVED = 'Pagamento confirmado!'
const STATUS_REJECTED = 'Pagamento não aprovado.'

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
  const codeFieldId = useId()
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
          setStatusLabel(STATUS_APPROVED)
          onApproved()
          return
        }
        if (result.orderStatus === 'recusado' || result.orderStatus === 'cancelado') {
          setStatusLabel(STATUS_REJECTED)
          return
        }
        setStatusLabel('Aguardando confirmação do Pix...')
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
        setStatusLabel(STATUS_APPROVED)
        onApproved()
        return
      }
      setStatusLabel('Ainda não identificamos o pagamento. Se já pagou, aguarde alguns segundos.')
    } catch (error) {
      setStatusLabel(error instanceof Error ? error.message : 'Erro ao verificar')
    } finally {
      setChecking(false)
    }
  }

  const approved = statusLabel === STATUS_APPROVED
  const rejected = statusLabel === STATUS_REJECTED

  return (
    <div>
      <p className="text-center text-sm leading-relaxed text-muted">
        Escaneie o QR Code no app do seu banco ou use o código Pix copia e cola. A confirmação é automática.
      </p>

      {pix.qrCodeBase64 && (
        <div className="mx-auto mt-5 w-fit rounded-2xl border border-line bg-white p-3 shadow-card">
          <img
            src={`data:image/png;base64,${pix.qrCodeBase64}`}
            alt="QR Code Pix"
            className="h-48 w-48 sm:h-52 sm:w-52"
          />
        </div>
      )}

      <div className="mt-5">
        <label htmlFor={codeFieldId} className="text-sm font-medium text-ink">
          Pix copia e cola
        </label>
        <textarea
          id={codeFieldId}
          readOnly
          rows={3}
          value={pix.qrCode}
          onFocus={(event) => event.currentTarget.select()}
          className="mt-1.5 block w-full resize-none break-all rounded-xl border border-transparent bg-surface px-3.5 py-3 font-mono text-xs leading-relaxed text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
        />
        <Button className="mt-3 w-full" onClick={() => void copyPix()}>
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {copied ? 'Código copiado!' : 'Copiar código'}
        </Button>
      </div>

      <p
        role="status"
        aria-live="polite"
        className={`mt-5 flex items-start justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
          approved ? 'bg-success/10 text-ink' : rejected ? 'bg-danger/10 text-ink' : 'bg-brand-mint text-ink'
        }`}
      >
        {approved ? (
          <CircleCheck size={18} className="mt-px shrink-0 text-success" aria-hidden="true" />
        ) : rejected ? (
          <CircleAlert size={18} className="mt-px shrink-0 text-danger" aria-hidden="true" />
        ) : (
          <LoaderCircle size={18} className="mt-px shrink-0 animate-spin text-brand" aria-hidden="true" />
        )}
        <span>{statusLabel}</span>
      </p>

      <div className="mt-4 grid gap-2">
        <Button variant="secondary" className="w-full" disabled={checking} onClick={() => void handleManualCheck()}>
          {checking ? (
            <>
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
              Verificando...
            </>
          ) : (
            'Já paguei, verificar agora'
          )}
        </Button>

        {onClose && (
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Fechar
          </Button>
        )}
      </div>

      {pix.ticketUrl && (
        <p className="mt-3 text-center">
          <a
            href={pix.ticketUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-hover"
          >
            Abrir página do Pix
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </p>
      )}
    </div>
  )
}
