import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { AddressCard } from './AddressCard'
import { AddressForm } from './AddressForm'
import { Button, Skeleton } from './ui'
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

  if (isLoading) return <Skeleton className="h-40" />

  return (
    <div className="grid gap-4">
      {addresses.length > 0 && !showNewForm && (
        <div className="grid gap-2">
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

      {showNewForm || addresses.length === 0 ? (
        <AddressForm
          onSubmit={handleCreate}
          submitLabel="Usar este endereco"
          showSaveCheckbox
          loading={saving}
        />
      ) : (
        <Button variant="secondary" onClick={() => setShowNewForm(true)}>
          + Usar outro endereco
        </Button>
      )}

      {showNewForm && addresses.length > 0 && (
        <Button variant="ghost" onClick={() => setShowNewForm(false)}>
          Voltar aos enderecos salvos
        </Button>
      )}

    </div>
  )
}
