import { getSupabaseAdmin } from './supabaseAdmin'

const onlyDigits = (value: string) => value.replace(/\D/g, '')

type SuperFreteAddress = {
  name?: string
  address?: string
  district?: string
  city?: string
  state_abbr?: string
  postal_code?: string
  location_number?: string
  complement?: string | null
  document?: string | null
}

type OrderRow = {
  id: string
  status: string
  total: number
  subtotal: number
  frete: number
  frete_servico: string | null
  frete_service_id: string | null
  frete_cep: string | null
  mp_payment_id: string | null
  endereco_snapshot: Record<string, string | null> | null
  superfrete_cart_id: string | null
  usuarios?: {
    nome?: string | null
    email?: string | null
    telefone?: string | null
    cpf?: string | null
  } | null
  enderecos?: {
    nome_destinatario?: string
    cep?: string
    rua?: string
    numero?: string
    complemento?: string | null
    bairro?: string
    cidade?: string
    estado?: string
  } | null
  itens_pedido?: Array<{
    quantidade: number
    preco_unitario: number
    produtos?: {
      nome?: string
      peso_kg?: number
      altura_cm?: number
      largura_cm?: number
      comprimento_cm?: number
    } | null
  }>
}

function superfreteConfig() {
  const token = process.env.SUPERFRETE_TOKEN
  const originCep = onlyDigits(process.env.SUPERFRETE_ORIGIN_CEP ?? '')
  const userAgent =
    process.env.SUPERFRETE_USER_AGENT ?? 'A&E Total Mix (contato@passarinsuplementos.com.br)'
  const environment = process.env.SUPERFRETE_ENV ?? 'production'
  const baseUrl = environment === 'production' ? 'https://api.superfrete.com' : 'https://sandbox.superfrete.com'
  const platform = process.env.SUPERFRETE_PLATFORM ?? 'A&E Total Mix'
  return { token, originCep, userAgent, baseUrl, platform }
}

function resolveServiceId(order: OrderRow): number | null {
  if (order.frete_service_id && /^\d+$/.test(order.frete_service_id)) {
    return Number(order.frete_service_id)
  }
  const name = (order.frete_servico ?? '').toUpperCase()
  if (name.includes('SEDEX')) return 2
  if (name.includes('PAC')) return 1
  if (name.includes('MINI')) return 17
  return null
}

function buildPackage(items: NonNullable<OrderRow['itens_pedido']>) {
  const expanded = items.flatMap((item) => {
    const qty = Math.max(1, Number(item.quantidade) || 1)
    return Array.from({ length: qty }, () => item.produtos)
  })

  const weight = expanded.reduce((sum, product) => sum + Number(product?.peso_kg ?? 0.3), 0)

  return {
    height: Math.max(2, Math.ceil(expanded.reduce((sum, product) => sum + Number(product?.altura_cm ?? 2), 0))),
    width: Math.max(11, Math.ceil(Math.max(...expanded.map((product) => Number(product?.largura_cm ?? 11)), 11))),
    length: Math.max(16, Math.ceil(Math.max(...expanded.map((product) => Number(product?.comprimento_cm ?? 16)), 16))),
    weight: Math.max(0.3, Number(weight.toFixed(3))),
  }
}

function formatSuperFreteError(payload: {
  message?: string
  error?: string
  errors?: unknown
} | null): string {
  if (payload?.errors && typeof payload.errors === 'object' && !Array.isArray(payload.errors)) {
    const parts = Object.entries(payload.errors as Record<string, unknown>).map(([key, value]) => {
      const detail = Array.isArray(value) ? value.join(', ') : String(value)
      return `${key}: ${detail}`
    })
    if (parts.length) return parts.join(' | ')
  }
  return payload?.message ?? payload?.error ?? 'Erro SuperFrete'
}

function normalizeDocument(raw: string | null | undefined): string | null {
  const digits = onlyDigits(raw ?? '')
  if (digits.length === 11 || digits.length === 14) return digits
  return null
}

async function fetchDocumentFromMercadoPago(paymentId: string | null): Promise<string | null> {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken || !paymentId) return null
  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) return null
    const payment = (await response.json()) as {
      payer?: { identification?: { number?: string | null } | null }
    }
    return normalizeDocument(payment.payer?.identification?.number)
  } catch {
    return null
  }
}

async function fetchSenderAddress(
  baseUrl: string,
  token: string,
  userAgent: string,
  originCep: string,
): Promise<SuperFreteAddress | null> {
  try {
    const response = await fetch(`${baseUrl}/api/v0/user/addresses`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': userAgent,
        accept: 'application/json',
      },
    })
    if (!response.ok) return null
    const payload = (await response.json()) as SuperFreteAddress[] | { data?: SuperFreteAddress[] }
    const list = Array.isArray(payload) ? payload : (payload.data ?? [])
    if (!list.length) return null
    const match = list.find((address) => onlyDigits(address.postal_code ?? '') === originCep)
    return match ?? list[0]
  } catch {
    return null
  }
}

/**
 * Cria frete no carrinho da SuperFrete apos pagamento aprovado.
 * Nao finaliza/paga a etiqueta automaticamente (nao gasta saldo sem revisao).
 */
export async function createSuperFreteCartForOrder(orderId: string): Promise<{
  ok: boolean
  cartId?: string
  message?: string
}> {
  const { token, originCep, userAgent, baseUrl, platform } = superfreteConfig()
  if (!token) return { ok: false, message: 'SUPERFRETE_TOKEN ausente' }
  if (originCep.length !== 8) return { ok: false, message: 'SUPERFRETE_ORIGIN_CEP invalido' }

  const supabase = getSupabaseAdmin()
  const { data: order, error } = await supabase
    .from('pedidos')
    .select(
      '*, usuarios(nome, email, telefone, cpf), enderecos(*), itens_pedido(quantidade, preco_unitario, produtos(nome, peso_kg, altura_cm, largura_cm, comprimento_cm))',
    )
    .eq('id', orderId)
    .maybeSingle()

  let typedOrder = order
  if (error && String(error.message).toLowerCase().includes('cpf')) {
    const fallback = await supabase
      .from('pedidos')
      .select(
        '*, usuarios(nome, email, telefone), enderecos(*), itens_pedido(quantidade, preco_unitario, produtos(nome, peso_kg, altura_cm, largura_cm, comprimento_cm))',
      )
      .eq('id', orderId)
      .maybeSingle()
    if (fallback.error || !fallback.data) {
      return { ok: false, message: fallback.error?.message ?? error.message }
    }
    typedOrder = fallback.data
  } else if (error || !order) {
    return { ok: false, message: error?.message ?? 'Pedido nao encontrado' }
  }

  const typed = typedOrder as OrderRow
  if (typed.superfrete_cart_id) {
    return { ok: true, cartId: typed.superfrete_cart_id, message: 'Ja enviado para SuperFrete' }
  }

  const serviceId = resolveServiceId(typed)
  if (!serviceId) {
    return { ok: false, message: 'Servico de frete SuperFrete nao identificado no pedido' }
  }

  const items = typed.itens_pedido ?? []
  if (items.length === 0) return { ok: false, message: 'Pedido sem itens' }

  const snapshot = typed.endereco_snapshot
  const address = typed.enderecos
  const toPostal = onlyDigits(snapshot?.cep ?? address?.cep ?? typed.frete_cep ?? '')
  if (toPostal.length !== 8) return { ok: false, message: 'CEP de destino invalido' }

  const toDocument =
    normalizeDocument(snapshot?.cpf) ??
    normalizeDocument(typed.usuarios?.cpf) ??
    (await fetchDocumentFromMercadoPago(typed.mp_payment_id))

  if (!toDocument) {
    return {
      ok: false,
      message: 'CPF do destinatario obrigatorio para gerar frete na SuperFrete',
    }
  }

  const senderFromApi = await fetchSenderAddress(baseUrl, token, userAgent, originCep)
  const fromDocument =
    normalizeDocument(process.env.SUPERFRETE_FROM_DOCUMENT) ??
    normalizeDocument(senderFromApi?.document ?? null)

  if (!fromDocument) {
    return {
      ok: false,
      message:
        'CPF/CNPJ do remetente ausente. Configure SUPERFRETE_FROM_DOCUMENT no .env com o documento da loja.',
    }
  }

  const sender =
    senderFromApi ??
    ({
      name: process.env.SUPERFRETE_FROM_NAME ?? 'A&E Total Mix',
      address: process.env.SUPERFRETE_FROM_ADDRESS ?? 'Endereco da loja',
      district: process.env.SUPERFRETE_FROM_DISTRICT ?? 'Centro',
      city: process.env.SUPERFRETE_FROM_CITY ?? 'Betim',
      state_abbr: process.env.SUPERFRETE_FROM_STATE ?? 'MG',
      postal_code: originCep,
      location_number: process.env.SUPERFRETE_FROM_NUMBER ?? 'S/N',
      complement: process.env.SUPERFRETE_FROM_COMPLEMENT ?? null,
    } satisfies SuperFreteAddress)

  const volumes = buildPackage(items)
  const body = {
    from: {
      name: sender.name,
      address: sender.address,
      district: sender.district,
      city: sender.city,
      state_abbr: sender.state_abbr,
      postal_code: onlyDigits(sender.postal_code ?? originCep),
      location_number: sender.location_number ?? 'S/N',
      complement: sender.complement ?? undefined,
      document: fromDocument,
      email: process.env.SUPERFRETE_FROM_EMAIL ?? undefined,
    },
    to: {
      name: snapshot?.nome_destinatario ?? address?.nome_destinatario ?? typed.usuarios?.nome ?? 'Cliente',
      address: snapshot?.rua ?? address?.rua ?? '',
      district: snapshot?.bairro ?? address?.bairro ?? '',
      city: snapshot?.cidade ?? address?.cidade ?? '',
      state_abbr: snapshot?.estado ?? address?.estado ?? '',
      postal_code: toPostal,
      location_number: snapshot?.numero ?? address?.numero ?? 'S/N',
      complement: snapshot?.complemento ?? address?.complemento ?? undefined,
      email: typed.usuarios?.email ?? undefined,
      document: toDocument,
      phone: onlyDigits(typed.usuarios?.telefone ?? '') || undefined,
    },
    service: serviceId,
    products: items.map((item) => ({
      name: item.produtos?.nome ?? 'Produto',
      quantity: item.quantidade,
      unitary_value: Number(item.preco_unitario),
    })),
    volumes,
    options: (() => {
      const subtotal = Number(typed.subtotal) || 0
      const minInsurance = 25.63
      // Pedidos baratos: sem seguro (SuperFrete exige minimo de R$ 25,63 se ativo).
      if (subtotal < minInsurance) {
        return {
          own_hand: false,
          receipt: false,
          insurance_value: 0,
          use_insurance_value: false,
        }
      }
      return {
        own_hand: false,
        receipt: false,
        insurance_value: subtotal,
        use_insurance_value: true,
      }
    })(),
    platform,
    // O UUID completo permite que o webhook relacione a etiqueta ao pedido sem ambiguidade.
    tag: orderId,
  }

  try {
    const response = await fetch(`${baseUrl}/api/v0/cart`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': userAgent,
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string; error?: string; errors?: unknown }
      | null

    if (!response.ok || !payload?.id) {
      const message = formatSuperFreteError(payload) || `Erro SuperFrete (${response.status})`
      console.error('[superfrete] falha ao criar cart', { orderId, status: response.status, payload })
      return { ok: false, message }
    }

    const { error: updateError } = await supabase
      .from('pedidos')
      .update({
        superfrete_cart_id: String(payload.id),
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updateError) {
      console.warn('[superfrete] nao salvou cart id no pedido', updateError.message)
    }

    return { ok: true, cartId: String(payload.id) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao falar com SuperFrete'
    console.error('[superfrete] exception', { orderId, message })
    return { ok: false, message }
  }
}
