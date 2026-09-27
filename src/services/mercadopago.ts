import { authHeaders } from '../lib/authToken'

export async function createMercadoPagoPreference(orderId: string) {
  const headers = await authHeaders()
  const response = await fetch('/api/mp/create-preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ orderId }),
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(error?.message ?? 'Erro ao iniciar checkout')
  }

  return (await response.json()) as { initPoint: string; preferenceId: string }
}

export interface PaymentResult {
  status: string
  statusDetail?: string
  orderStatus: string
  paymentId: number | string
  pix: { qrCode: string; qrCodeBase64?: string; ticketUrl?: string } | null
  boletoUrl: string | null
}

export async function processPayment(orderId: string, formData: Record<string, unknown>) {
  const headers = await authHeaders()
  const response = await fetch('/api/mp/process-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ orderId, formData }),
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(error?.message ?? 'Erro ao processar pagamento')
  }

  return (await response.json()) as PaymentResult
}

export interface ResumePaymentResult {
  status: string
  orderStatus: string
  paymentId: number | string | null
  pix: PaymentResult['pix']
  boletoUrl: string | null
  initPoint: string | null
}

/** Retoma pagamento de pedido pendente (exibe Pix existente ou gera novo / checkout MP). */
export async function resumePayment(orderId: string, method?: 'pix' | 'cartao') {
  const headers = await authHeaders()
  const response = await fetch('/api/mp/resume-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ orderId, method }),
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(error?.message ?? 'Erro ao retomar pagamento')
  }

  return (await response.json()) as ResumePaymentResult
}

/** Consulta/sincroniza status do pagamento no Mercado Pago. */
export async function checkPaymentStatus(orderId: string) {
  const headers = await authHeaders()
  const response = await fetch('/api/mp/check-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ orderId }),
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(error?.message ?? 'Erro ao verificar pagamento')
  }

  return (await response.json()) as {
    orderStatus: string
    paymentStatus: string | null
    synced: boolean
    paymentId?: number | string
    message?: string
    superfrete?: { ok: boolean; cartId?: string; message?: string }
  }
}

/** Envia pedido aprovado ao carrinho SuperFrete (pode informar CPF). */
export async function pushOrderToSuperFrete(orderId: string, cpf?: string) {
  const headers = await authHeaders()
  const response = await fetch('/api/shipping/push-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ orderId, cpf }),
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(error?.message ?? 'Erro ao enviar frete para SuperFrete')
  }

  return (await response.json()) as { ok: boolean; cartId?: string; message?: string }
}

/** Cadastra uma unica vez o webhook de rastreamento na conta SuperFrete. */
export async function registerSuperFreteWebhook() {
  const headers = await authHeaders()
  const response = await fetch('/api/shipping/register-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean
    message?: string
  } | null
  if (!response.ok) {
    throw new Error(payload?.message ?? 'Erro ao ativar rastreamento SuperFrete')
  }
  return payload
}
