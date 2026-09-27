interface ViaCepResponse {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export interface CepLookupResult {
  rua: string
  bairro: string
  cidade: string
  estado: string
}

export async function fetchAddressByCep(cep: string): Promise<CepLookupResult | null> {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
  if (!response.ok) return null

  const data = (await response.json()) as ViaCepResponse
  if (data.erro || !data.logradouro) return null

  return {
    rua: data.logradouro,
    bairro: data.bairro,
    cidade: data.localidade,
    estado: data.uf,
  }
}
