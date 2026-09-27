import { useState, type FormEvent } from 'react'
import { Button, Input, Select, useToast } from './ui'
import { addressSchema, type AddressInput } from '../schemas'
import { fetchAddressByCep } from '../services/viacep'

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

function formatCep(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

interface AddressFormProps {
  defaultValues?: Partial<AddressInput>
  onSubmit: (data: AddressInput & { save: boolean }) => void | Promise<void>
  submitLabel?: string
  showSaveCheckbox?: boolean
  loading?: boolean
}

export function AddressForm({
  defaultValues = {},
  onSubmit,
  submitLabel = 'Salvar endereco',
  showSaveCheckbox = true,
  loading = false,
}: AddressFormProps) {
  const { notify } = useToast()
  const [cepLoading, setCepLoading] = useState(false)
  const [save, setSave] = useState(showSaveCheckbox)
  const [form, setForm] = useState<AddressInput>({
    nome_destinatario: defaultValues.nome_destinatario ?? '',
    cep: defaultValues.cep ? formatCep(defaultValues.cep) : '',
    rua: defaultValues.rua ?? '',
    numero: defaultValues.numero ?? '',
    complemento: defaultValues.complemento ?? '',
    bairro: defaultValues.bairro ?? '',
    cidade: defaultValues.cidade ?? '',
    estado: defaultValues.estado ?? '',
  })

  const updateField = (field: keyof AddressInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleCepBlur = async () => {
    const digits = form.cep.replace(/\D/g, '')
    if (digits.length !== 8) return

    try {
      setCepLoading(true)
      const result = await fetchAddressByCep(digits)
      if (!result) {
        notify('CEP nao encontrado', 'error')
        return
      }
      setForm((current) => ({
        ...current,
        rua: result.rua,
        bairro: result.bairro,
        cidade: result.cidade,
        estado: result.estado,
      }))
    } catch {
      notify('Erro ao buscar CEP', 'error')
    } finally {
      setCepLoading(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const parsed = addressSchema.safeParse({
      ...form,
      cep: form.cep.replace(/\D/g, ''),
      estado: form.estado.toUpperCase(),
    })

    if (!parsed.success) {
      notify(parsed.error.issues[0]?.message ?? 'Preencha todos os campos obrigatorios', 'error')
      return
    }

    await onSubmit({ ...parsed.data, save: showSaveCheckbox && save })
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <Input
        placeholder="Nome do destinatario"
        value={form.nome_destinatario}
        onChange={(event) => updateField('nome_destinatario', event.target.value)}
        required
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          placeholder="CEP"
          inputMode="numeric"
          maxLength={9}
          value={form.cep}
          onChange={(event) => updateField('cep', formatCep(event.target.value))}
          onBlur={handleCepBlur}
          required
        />
        {cepLoading && <span className="self-center text-sm text-gray-500">Buscando...</span>}
      </div>
      <Input
        placeholder="Rua"
        value={form.rua}
        onChange={(event) => updateField('rua', event.target.value)}
        required
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="Numero"
          value={form.numero}
          onChange={(event) => updateField('numero', event.target.value)}
          required
        />
        <Input
          placeholder="Complemento (opcional)"
          value={form.complemento ?? ''}
          onChange={(event) => updateField('complemento', event.target.value)}
        />
      </div>
      <Input
        placeholder="Bairro"
        value={form.bairro}
        onChange={(event) => updateField('bairro', event.target.value)}
        required
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <Input
          placeholder="Cidade"
          value={form.cidade}
          onChange={(event) => updateField('cidade', event.target.value)}
          required
        />
        <Select
          value={form.estado}
          onChange={(event) => updateField('estado', event.target.value)}
          required
        >
          <option value="">UF</option>
          {BRAZILIAN_STATES.map((uf) => (
            <option key={uf} value={uf}>{uf}</option>
          ))}
        </Select>
      </div>
      {showSaveCheckbox && (
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={save} onChange={(event) => setSave(event.target.checked)} />
          Salvar endereco na minha conta
        </label>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? 'Salvando...' : submitLabel}
      </Button>
    </form>
  )
}
