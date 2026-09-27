import { LoaderCircle } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Button, Input, Select, useToast } from './ui'
import { addressSchema, type AddressInput } from '../schemas'
import { fetchAddressByCep } from '../services/viacep'
import { cn } from '../utils/cn'

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

function Field({
  id,
  label,
  optional,
  hint,
  className,
  children,
}: {
  id: string
  label: string
  optional?: boolean
  hint?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {optional && <span className="font-normal text-muted"> (opcional)</span>}
      </label>
      {children}
      {hint}
    </div>
  )
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
  submitLabel = 'Salvar endereço',
  showSaveCheckbox = true,
  loading = false,
}: AddressFormProps) {
  const { notify } = useToast()
  const uid = useId()
  const fieldId = (field: string) => `${uid}-${field}`
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
        notify('CEP não encontrado', 'error')
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
      notify(parsed.error.issues[0]?.message ?? 'Preencha todos os campos obrigatórios', 'error')
      return
    }

    await onSubmit({ ...parsed.data, save: showSaveCheckbox && save })
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <Field id={fieldId('nome')} label="Nome do destinatário">
        <Input
          id={fieldId('nome')}
          placeholder="Nome completo de quem vai receber"
          autoComplete="name"
          value={form.nome_destinatario}
          onChange={(event) => updateField('nome_destinatario', event.target.value)}
          required
        />
      </Field>

      <Field
        id={fieldId('cep')}
        label="CEP"
        className="sm:max-w-[240px]"
        hint={
          cepLoading ? (
            <span className="flex items-center gap-1.5 text-xs text-muted" role="status">
              <LoaderCircle size={14} className="animate-spin text-brand" aria-hidden="true" />
              Buscando endereço...
            </span>
          ) : (
            <span className="text-xs text-muted">Preenchemos rua, bairro e cidade automaticamente.</span>
          )
        }
      >
        <Input
          id={fieldId('cep')}
          placeholder="00000-000"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={9}
          value={form.cep}
          onChange={(event) => updateField('cep', formatCep(event.target.value))}
          onBlur={handleCepBlur}
          required
        />
      </Field>

      <Field id={fieldId('rua')} label="Rua">
        <Input
          id={fieldId('rua')}
          placeholder="Rua, avenida, travessa..."
          autoComplete="address-line1"
          value={form.rua}
          onChange={(event) => updateField('rua', event.target.value)}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
        <Field id={fieldId('numero')} label="Número">
          <Input
            id={fieldId('numero')}
            placeholder="Ex.: 123"
            value={form.numero}
            onChange={(event) => updateField('numero', event.target.value)}
            required
          />
        </Field>
        <Field id={fieldId('complemento')} label="Complemento" optional>
          <Input
            id={fieldId('complemento')}
            placeholder="Apto, bloco, referência..."
            autoComplete="address-line2"
            value={form.complemento ?? ''}
            onChange={(event) => updateField('complemento', event.target.value)}
          />
        </Field>
      </div>

      <Field id={fieldId('bairro')} label="Bairro">
        <Input
          id={fieldId('bairro')}
          placeholder="Bairro"
          value={form.bairro}
          onChange={(event) => updateField('bairro', event.target.value)}
          required
        />
      </Field>

      <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
        <Field id={fieldId('cidade')} label="Cidade">
          <Input
            id={fieldId('cidade')}
            placeholder="Cidade"
            autoComplete="address-level2"
            value={form.cidade}
            onChange={(event) => updateField('cidade', event.target.value)}
            required
          />
        </Field>
        <Field id={fieldId('estado')} label="UF">
          <Select
            id={fieldId('estado')}
            autoComplete="address-level1"
            value={form.estado}
            onChange={(event) => updateField('estado', event.target.value)}
            required
          >
            <option value="">UF</option>
            {BRAZILIAN_STATES.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </Select>
        </Field>
      </div>

      {showSaveCheckbox && (
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={save}
            onChange={(event) => setSave(event.target.checked)}
            className="h-4 w-4 shrink-0 cursor-pointer rounded border-line accent-brand"
          />
          Salvar endereço na minha conta
        </label>
      )}

      <Button type="submit" disabled={loading} className="w-full sm:w-auto sm:justify-self-start">
        {loading ? (
          <>
            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
            Salvando...
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  )
}
