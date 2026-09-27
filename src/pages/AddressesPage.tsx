import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { AddressCard } from '../components/AddressCard'
import { AddressForm } from '../components/AddressForm'
import { Button, EmptyState, Skeleton, useConfirm, useToast } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import {
  createAddress,
  deleteAddress,
  getMyAddresses,
  setPrimaryAddress,
  updateAddress,
} from '../services/addresses'
import type { AddressInput } from '../schemas'
import type { Address } from '../types'

export function AddressesPage() {
  const { user } = useAuth()
  const { notify } = useToast()
  const { confirm } = useConfirm()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)
  const [saving, setSaving] = useState(false)

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: () => getMyAddresses(user?.id ?? ''),
    enabled: Boolean(user),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['addresses', user?.id] })

  const handleSave = async (data: AddressInput & { save: boolean }) => {
    if (!user) return
    try {
      setSaving(true)
      if (editing) {
        await updateAddress(editing.id, user.id, data)
        notify('Endereco atualizado')
      } else {
        await createAddress(user.id, data)
        notify('Endereco adicionado')
      }
      await invalidate()
      setShowForm(false)
      setEditing(null)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao salvar endereco', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (addressId: string) => {
    if (!user) return
    const ok = await confirm({
      title: 'Excluir endereco',
      message: 'Tem certeza que deseja excluir este endereco?',
      confirmLabel: 'Excluir',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await deleteAddress(addressId, user.id)
      await invalidate()
      notify('Endereco excluido')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao excluir endereco', 'error')
    }
  }

  const handleSetPrimary = async (addressId: string) => {
    if (!user) return
    try {
      await setPrimaryAddress(user.id, addressId)
      await invalidate()
      notify('Endereco principal atualizado')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao definir endereco principal', 'error')
    }
  }

  return (
    <>
      <Helmet>
        <title>Enderecos - Passarin Suplementos</title>
      </Helmet>
      <div className="grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-black">Meus enderecos</h1>
            <p className="mt-1 text-sm text-gray-500">Gerencie os enderecos usados nas suas compras.</p>
          </div>
          {!showForm && (
            <Button
              onClick={() => {
                setEditing(null)
                setShowForm(true)
              }}
            >
              + Novo endereco
            </Button>
          )}
        </div>

        {showForm && (
          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-black">
              {editing ? 'Editar endereco' : 'Novo endereco'}
            </h2>
            <div className="mt-4">
              <AddressForm
                defaultValues={
                  editing
                    ? {
                        ...editing,
                        complemento: editing.complemento ?? undefined,
                      }
                    : undefined
                }
                onSubmit={handleSave}
                submitLabel={editing ? 'Atualizar endereco' : 'Salvar endereco'}
                showSaveCheckbox={false}
                loading={saving}
              />
            </div>
            <Button
              variant="ghost"
              className="mt-3"
              onClick={() => {
                setShowForm(false)
                setEditing(null)
              }}
            >
              Cancelar
            </Button>
          </div>
        )}

        {isLoading && <Skeleton className="h-40" />}

        {!isLoading && addresses.length === 0 && !showForm && (
          <EmptyState
            title="Nenhum endereco cadastrado"
            description="Adicione um endereco para agilizar suas proximas compras."
          />
        )}

        <div className="grid gap-3">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="rounded-[2rem] border border-gray-100 bg-white p-4 shadow-sm"
            >
              <AddressCard address={address} />
              <div className="mt-3 flex flex-wrap gap-2">
                {!address.principal && (
                  <Button variant="secondary" onClick={() => handleSetPrimary(address.id)}>
                    <Star size={16} /> Tornar principal
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditing(address)
                    setShowForm(true)
                  }}
                >
                  <Pencil size={16} /> Editar
                </Button>
                <Button variant="danger" onClick={() => handleDelete(address.id)}>
                  <Trash2 size={16} /> Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
