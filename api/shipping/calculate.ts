import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientIp, rateLimit } from '../_lib/rateLimit'
import { quoteShipping, type ShippingQuoteItem } from '../_lib/shippingQuote'

interface CalculatorRequest {
  cep?: string
  items?: ShippingQuoteItem[]
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' })
  }

  // Endpoint publico (carrinho de visitante usa antes do login): protege a cota da
  // SuperFrete contra abuso com rate limit por IP.
  if (!rateLimit(`shipping:${getClientIp(request)}`, 30, 60_000)) {
    return response.status(429).json({ message: 'Muitas consultas de frete. Aguarde alguns instantes.' })
  }

  if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) {
    return response.status(400).json({ message: 'Dados de frete invalidos' })
  }
  const { cep, items = [] } = request.body as CalculatorRequest
  if (!Array.isArray(items)) {
    return response.status(400).json({ message: 'Itens de frete invalidos' })
  }

  try {
    const options = await quoteShipping(cep ?? '', items)
    return response.status(200).json({ options })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao calcular frete'
    const configurationError = /token|origem/i.test(message)
    return response.status(configurationError ? 500 : 400).json({ message })
  }
}
