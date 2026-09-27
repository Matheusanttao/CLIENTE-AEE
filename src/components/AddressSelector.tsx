import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AddressCard } from './AddressCard'
import { AddressForm } from './AddressForm'
import { Skeleton } from './ui'
import { useAuth } from '../contexts/AuthContext'
import { createAddress, getMyAddresses } from '../services/addresses'
import type { AddressInput } from '../schemas'

interface AddressSelectorProps {
  selectedAddressId: string | null
  onSelect: (addressId: string) => void
}

export function AddressSelector({ selectedAddressId, onSelect }: AddressSelectorProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showNewForm, setShowNewForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: () => getMyAddresses(user?.id ?? ''),
    enabled: Boolean(user),
  })

  useEffect(() => {
    if (selectedAddressId || showNewForm || addresses.length === 0) return
    const preferred = addresses.find((address) => address.principal) ?? addresses[0]
    if (preferred) onSelect(preferred.id)
  }, [addresses, onSelect, selectedAddressId, showNewForm])

  const handleCreate = async (data: AddressInput & { save: boolean }) => {
    if (!user) return
    try {
      setSaving(true)
      const address = data.save
        ? await createAddress(user.id, data)
        : await createAddress(user.id, data, { principal: false })

      await queryClient.invalidateQueries({ queryKey: ['addresses', user.id] })
      onSelect(address.id)
      setShowNewForm(false)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-3" aria-busy="true" aria-label="Carregando endereços">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    )
  }

  const showForm = showNewForm || addresses.length === 0

  return (
    <div className="grid gap-3">
      {addresses.length > 0 && !showNewForm && (
        <div className="grid gap-3" role="radiogroup" aria-label="Endereços salvos">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              selected={selectedAddressId === address.id}
              onSelect={() => onSelect(address.id)}
            />
          ))}
        </div>
      )}

      {showForm ? (
        <div className="rounded-2xl border border-line bg-surface/50 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h4 className="text-base font-semibold text-ink">
              {addresses.length === 0 ? 'Cadastre o endereço de entrega' : 'Novo endereço'}
            </h4>
            {showNewForm && addresses.length > 0 && (
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Voltar aos endereços salvos
              </button>
            )}
          </div>
          <AddressForm
            onSubmit={handleCreate}
            submitLabel="Usar este endereço"
            showSaveCheckbox
            loading={saving}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNewForm(true)}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-4 py-3 text-sm font-semibold text-brand transition-colors hover:border-brand hover:bg-brand-mint/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
        >
          <Plus size={16} aria-hidden="true" />
          Usar outro endereço
        </button>
      )}
    </div>
  )
}
