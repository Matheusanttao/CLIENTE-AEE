import type { VercelRequest, VercelResponse } from '@vercel/node'
import adminCancel from './orders/_admin-cancel'
import cancel from './orders/_cancel'
import create from './orders/_create'
import track from './orders/_track'
import sitemap from './_lib/sitemap'

type ApiHandler = (request: VercelRequest, response: VercelResponse) => unknown

const handlers: Record<string, ApiHandler> = {
  'admin-cancel': adminCancel,
  cancel,
  create,
  track,
  // Reusa esta funcao (Hobby: max 12) em vez de api/sitemap.ts separado
  sitemap,
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const action = Array.isArray(request.query.action) ? request.query.action[0] : request.query.action
  const actionHandler = typeof action === 'string' ? handlers[action] : undefined

  if (!actionHandler) {
    return response.status(404).json({ message: 'Endpoint de pedidos nao encontrado' })
  }

  return actionHandler(request, response)
}
