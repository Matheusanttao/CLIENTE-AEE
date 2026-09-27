import { Badge } from './ui'
import type { Address } from '../types'
import { cn } from '../utils/cn'
import { formatAddressLine, formatCep } from '../utils/format'

interface AddressCardProps {
  address: Address
  selected?: boolean
  onSelect?: () => void
  name?: string
}

function AddressDetails({ address }: { address: Address }) {
  return (
    <span className="grid min-w-0 flex-1 gap-1">
      <span className="flex flex-wrap items-center gap-2">
        <strong className="font-semibold text-ink">{address.nome_destinatario}</strong>
        {address.principal && <Badge>Principal</Badge>}
      </span>
      <span className="leading-relaxed text-muted">{formatAddressLine(address)}</span>
      <span className="text-muted">CEP {formatCep(address.cep)}</span>
    </span>
  )
}

/**
 * Endereco do cliente. Com `onSelect` vira um card selecionavel (radio);
 * sem `onSelect` mostra apenas o conteudo, para ser usado dentro de outro card.
 */
export function AddressCard({ address, selected, onSelect, name = 'address' }: AddressCardProps) {
  if (!onSelect) {
    return (
      <div className="flex text-sm">
        <AddressDetails address={address} />
      </div>
    )
  }

  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm transition',
        'has-[input:focus-visible]:ring-4 has-[input:focus-visible]:ring-brand/20',
        selected
          ? 'border-brand bg-brand-mint/40 ring-2 ring-brand/15'
          : 'border-line bg-white hover:border-[#D0D5DD]',
      )}
    >
      <input type="radio" name={name} checked={Boolean(selected)} onChange={onSelect} className="sr-only" />
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 bg-white transition',
          selected ? 'border-brand' : 'border-[#D0D5DD]',
        )}
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
      </span>
      <AddressDetails address={address} />
    </label>
  )
}
