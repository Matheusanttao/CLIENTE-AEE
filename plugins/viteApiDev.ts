import type { IncomingMessage, ServerResponse } from 'node:http'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Plugin } from 'vite'
import { loadEnv } from 'vite'

type ApiHandler = (req: VercelRequest, res: VercelResponse) => void | Promise<void | VercelResponse>

const readBody = (req: IncomingMessage) =>
  new Promise<unknown>((resolve, reject) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      resolve({})
      return
    }

    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      if (!data) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(data))
      } catch {
        resolve({})
      }
    })
    req.on('error', reject)
  })

const createVercelResponse = (res: ServerResponse): VercelResponse => {
  let statusCode = 200
  const response = {
    status(code: number) {
      statusCode = code
      return response
    },
    setHeader(name: string, value: string | number | readonly string[]) {
      res.setHeader(name, value)
      return response
    },
    send(body: unknown) {
      res.statusCode = statusCode
      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        res.end(body)
      } else {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(body))
      }
      return response
    },
    json(payload: unknown) {
      res.statusCode = statusCode
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(payload))
      return response
    },
  }
  return response as VercelResponse
}

const apiRoutes: Record<string, () => Promise<{ default: ApiHandler }>> = {
  '/api/shipping/calculate': () => import('../api/shipping/calculate'),
  '/api/shipping/create-cart': () => import('../api/shipping/create-cart'),
  '/api/shipping/push-order': () => import('../api/shipping/push-order'),
  '/api/shipping/register-webhook': () => import('../api/shipping/register-webhook'),
  '/api/shipping/webhook': () => import('../api/shipping/webhook'),
  '/api/cloudinary/sign': () => import('../api/cloudinary/sign'),
  '/api/orders/track': () => import('../api/orders/_track'),
  '/api/orders/cancel': () => import('../api/orders/_cancel'),
  '/api/orders/admin-cancel': () => import('../api/orders/_admin-cancel'),
  '/api/orders/create': () => import('../api/orders/_create'),
  '/api/orders/sitemap': () => import('../api/_lib/sitemap'),
  '/sitemap.xml': () => import('../api/_lib/sitemap'),
  '/api/auth/welcome': () => import('../api/auth/welcome'),
  '/api/auth/request-password-reset': () => import('../api/auth/request-password-reset'),
  '/api/auth/confirm-password-reset': () => import('../api/auth/confirm-password-reset'),
  '/api/mp/create-preference': () => import('../api/_lib/mp-create-preference'),
  '/api/mp/process-payment': () => import('../api/_lib/mp-process-payment'),
  '/api/mp/resume-payment': () => import('../api/_lib/mp-resume-payment'),
  '/api/mp/check-payment': () => import('../api/_lib/mp-check-payment'),
  '/api/mp/webhook': () => import('../api/_lib/mp-webhook'),
}

export function viteApiDev(mode: string): Plugin {
  let envLoaded = false

  return {
    name: 'vite-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0]
        if (!pathname?.startsWith('/api/')) return next()

        const loadHandler = apiRoutes[pathname]
        if (!loadHandler) return next()

        if (!envLoaded) {
          Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
          envLoaded = true
        } else {
          // Mantem .env sincronizado em dev (sem precisar reiniciar a cada troca)
          Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
        }

        try {
          const handler = (await loadHandler()).default
          const url = new URL(req.url ?? '/', 'http://localhost')
          const body = await readBody(req)
          const vercelReq = {
            method: req.method,
            body,
            query: Object.fromEntries(url.searchParams.entries()),
            headers: req.headers,
          } as VercelRequest

          await handler(vercelReq, createVercelResponse(res))
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : typeof error === 'object' && error !== null && 'message' in error
                ? String((error as { message: unknown }).message)
                : 'Erro interno na API local'
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ message }))
        }
      })
    },
  }
}
