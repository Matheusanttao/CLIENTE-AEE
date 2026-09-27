export interface ShippingQuoteItem {
  id: string
  nome: string
  quantity: number
  peso_kg: number
  altura_cm: number
  largura_cm: number
  comprimento_cm: number
}

export interface ShippingQuote {
  id: string
  service: string
  carrier: string
  price: number
  deliveryTime: number
  cep: string
}

interface SuperFreteRate {
  id?: string | number
  name?: string
  price?: string | number
  custom_price?: string | number
  delivery_time?: string | number
  error?: string
  has_error?: boolean
  company?: { name?: string }
}

const onlyDigits = (value: string) => value.replace(/\D/g, '')
const isPositiveNumber = (value: unknown) => Number.isFinite(Number(value)) && Number(value) > 0

const toNumber = (value: string | number | undefined) => {
  if (typeof value === 'number') return value
  if (!value) return 0
  return Number(value.replace(',', '.'))
}

const buildPackage = (items: ShippingQuoteItem[]) => {
  const weight = items.reduce((sum, item) => sum + Number(item.peso_kg) * item.quantity, 0)

  return {
    height: Math.max(
      2,
      Math.ceil(items.reduce((sum, item) => sum + Number(item.altura_cm) * item.quantity, 0)),
    ),
    width: Math.max(11, Math.ceil(Math.max(...items.map((item) => Number(item.largura_cm))))),
    length: Math.max(16, Math.ceil(Math.max(...items.map((item) => Number(item.comprimento_cm))))),
    weight: Math.max(0.3, Number(weight.toFixed(3))),
  }
}

export async function quoteShipping(cep: string, items: ShippingQuoteItem[]): Promise<ShippingQuote[]> {
  const token = process.env.SUPERFRETE_TOKEN
  const originCep = onlyDigits(process.env.SUPERFRETE_ORIGIN_CEP ?? '')
  const userAgent = process.env.SUPERFRETE_USER_AGENT ?? 'Passarin Suplementos (contato@passarinsuplementos.com.br)'
  const environment = process.env.SUPERFRETE_ENV ?? 'production'
  const services = process.env.SUPERFRETE_SERVICES ?? '1,2,17'
  const baseUrl = environment === 'production' ? 'https://api.superfrete.com' : 'https://sandbox.superfrete.com'
  const destinationCep = onlyDigits(cep)

  if (!token) throw new Error('Token da SuperFrete nao configurado')
  if (originCep.length !== 8) throw new Error('CEP de origem da loja invalido')
  if (destinationCep.length !== 8) throw new Error('Informe um CEP valido')
  if (items.length === 0 || items.length > 50) throw new Error('Carrinho invalido')
  if (items.reduce((total, item) => total + Number(item.quantity || 0), 0) > 1000) {
    throw new Error('Quantidade total maxima excedida')
  }

  const invalidItem = items.find(
    (item) =>
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0 ||
      item.quantity > 1000 ||
      !isPositiveNumber(item.peso_kg) ||
      !isPositiveNumber(item.altura_cm) ||
      !isPositiveNumber(item.largura_cm) ||
      !isPositiveNumber(item.comprimento_cm),
  )
  if (invalidItem) throw new Error(`Produto "${invalidItem.nome}" sem peso, medidas ou quantidade validas`)

  const response = await fetch(`${baseUrl}/api/v0/calculator`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': userAgent,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: { postal_code: originCep },
      to: { postal_code: destinationCep },
      services,
      options: {
        own_hand: false,
        receipt: false,
        insurance_value: 0,
        use_insurance_value: false,
      },
      package: buildPackage(items),
    }),
  })

  const payload = (await response.json().catch(() => null)) as
    | SuperFreteRate[]
    | { message?: string; errors?: Record<string, string[]> }
    | null

  if (!response.ok || !Array.isArray(payload)) {
    const details =
      payload && !Array.isArray(payload) && payload.errors
        ? Object.values(payload.errors).flat().join(' ')
        : undefined
    const message = payload && !Array.isArray(payload) ? payload.message : undefined
    throw new Error(details ?? message ?? 'Erro ao calcular frete na SuperFrete')
  }

  const options = payload
    .filter((rate) => !rate.error && rate.has_error !== true && toNumber(rate.custom_price ?? rate.price) > 0)
    .map((rate) => ({
      id: String(rate.id ?? rate.name),
      service: rate.name ?? 'Entrega',
      carrier: rate.company?.name ?? 'SuperFrete',
      price: toNumber(rate.custom_price ?? rate.price),
      deliveryTime: Number(rate.delivery_time ?? 0),
      cep: destinationCep,
    }))

  if (options.length === 0) throw new Error('Nenhuma opcao de frete encontrada para este CEP')
  return options
}
