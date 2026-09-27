export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
  }).format(new Date(value))

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

export const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 8) return value
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export const formatAddressLine = (address: {
  rua: string
  numero: string
  complemento?: string | null
  bairro: string
  cidade: string
  estado: string
}) => {
  const complemento = address.complemento ? `, ${address.complemento}` : ''
  return `${address.rua}, ${address.numero}${complemento} - ${address.bairro}, ${address.cidade}/${address.estado}`
}
