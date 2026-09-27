import { CORREIOS_MAX_WEIGHT_KG } from '../lib/constants'

const onlyDigits = (value: string) => value.replace(/\D/g, '')

export type MaskKind = 'currency' | 'kg' | 'cm' | 'integer'

/** CPF mascarado 000.000.000-00 */
export function maskCpf(raw: string): string {
  const digits = onlyDigits(raw).slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function isValidCpf(raw: string): boolean {
  const cpf = onlyDigits(raw)
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  const calc = (base: string, factor: number) => {
    let sum = 0
    for (let i = 0; i < base.length; i += 1) sum += Number(base[i]) * (factor - i)
    const mod = (sum * 10) % 11
    return mod === 10 ? 0 : mod
  }
  const d1 = calc(cpf.slice(0, 9), 10)
  const d2 = calc(cpf.slice(0, 10), 11)
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10])
}

export function digitsOnly(value: string): string {
  return onlyDigits(value)
}

const MAX_KG_DIGITS = CORREIOS_MAX_WEIGHT_KG * 1000

export function maskValue(kind: MaskKind, raw: string): string {
  if (kind === 'currency') {
    const digits = onlyDigits(raw).slice(0, 11)
    if (!digits) return ''
    return (Number(digits) / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  if (kind === 'kg') {
    let digits = onlyDigits(raw).slice(0, String(MAX_KG_DIGITS).length)
    if (!digits) return ''
    if (Number(digits) > MAX_KG_DIGITS) digits = String(MAX_KG_DIGITS)
    const value = Number(digits) / 1000
    return `${value.toLocaleString('pt-BR', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })} kg`
  }

  if (kind === 'cm') {
    const digits = onlyDigits(raw).slice(0, 6)
    if (!digits) return ''
    const value = Number(digits) / 10
    return `${value.toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} cm`
  }

  const digits = onlyDigits(raw).slice(0, 8)
  if (!digits) return ''
  return String(Number(digits))
}

export function parseMaskedValue(kind: MaskKind, masked: string): number {
  const digits = onlyDigits(masked)
  if (!digits) return 0

  if (kind === 'currency') return Number(digits) / 100
  if (kind === 'kg') return Math.min(Number(digits) / 1000, CORREIOS_MAX_WEIGHT_KG)
  if (kind === 'cm') return Number(digits) / 10
  return Number(digits)
}

export function numberToMasked(kind: MaskKind, value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return ''

  if (kind === 'currency') {
    return maskValue('currency', String(Math.round(Number(value) * 100)))
  }
  if (kind === 'kg') {
    const capped = Math.min(Number(value), CORREIOS_MAX_WEIGHT_KG)
    return maskValue('kg', String(Math.round(capped * 1000)))
  }
  if (kind === 'cm') {
    return maskValue('cm', String(Math.round(Number(value) * 10)))
  }
  return maskValue('integer', String(Math.round(Number(value))))
}
