import { supabase } from '../lib/supabase'
import { getAccessToken } from '../lib/authToken'
import type { LoginInput, RegisterInput } from '../schemas'
import { digitsOnly } from '../utils/masks'

export const signIn = ({ email, password }: LoginInput) =>
  supabase.auth.signInWithPassword({ email, password })

export const signUp = ({ email, password, nome, cpf }: RegisterInput) =>
  supabase.auth.signUp({
    email,
    password,
    options: {
      // role e sempre forçada para 'cliente' no trigger handle_new_user — nao enviar role aqui.
      data: { nome, cpf: digitsOnly(cpf) },
    },
  })

async function parseResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null
  if (!response.ok) throw new Error(payload?.message ?? 'Não foi possível concluir a solicitação.')
  return payload
}

export async function requestPasswordResetCode(email: string) {
  const response = await fetch('/api/auth/request-password-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return parseResponse(response)
}

export async function confirmPasswordResetCode(email: string, code: string, password: string) {
  const response = await fetch('/api/auth/confirm-password-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, password }),
  })
  return parseResponse(response)
}

export async function requestWelcomeEmail(userId?: string, email?: string) {
  const token = await getAccessToken()
  const response = await fetch('/api/auth/welcome', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ userId, email }),
  })
  return parseResponse(response)
}
