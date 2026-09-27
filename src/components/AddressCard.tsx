import { Badge } from './ui'
import type { Address } from '../types'
import { formatAddressLine, formatCep } from '../utils/format'

interface AddressCardProps {
  address: Address
  selected?: boolean
  onSelect?: () => void
  name?: string
}

export function AddressCard({ address, selected, onSelect, name = 'address' }: AddressCardProps) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm transition ${
        selected ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-black'
      }`}
    >
      {onSelect && (
        <input type="radio" name={name} checked={selected} onChange={onSelect} className="mt-1" />
      )}
      <span className="grid flex-1 gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <strong className="text-black">{address.nome_destinatario}</strong>
          {address.principal && <Badge tone="success">Principal</Badge>}
        </span>
        <span className="text-gray-500">{formatAddressLine(address)}</span>
        <span className="text-gray-400">CEP {formatCep(address.cep)}</span>
      </span>
    </label>
  )
}
