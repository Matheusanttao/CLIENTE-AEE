import type { VercelRequest, VercelResponse } from '@vercel/node'
import checkPayment from './_lib/mp-check-payment'
import createPreference from './_lib/mp-create-preference'
import processPayment from './_lib/mp-process-payment'
import resumePayment from './_lib/mp-resume-payment'
import webhook from './_lib/mp-webhook'

type ApiHandler = (request: VercelRequest, response: VercelResponse) => unknown

const handlers: Record<string, ApiHandler> = {
  'check-payment': checkPayment,
  'create-preference': createPreference,
  'process-payment': processPayment,
  'resume-payment': resumePayment,
  webhook,
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const action = Array.isArray(request.query.action) ? request.query.action[0] : request.query.action
  const actionHandler = typeof action === 'string' ? handlers[action] : undefined

  if (!actionHandler) {
    return response.status(404).json({ message: 'Endpoint do Mercado Pago nao encontrado' })
  }

  return actionHandler(request, response)
}
