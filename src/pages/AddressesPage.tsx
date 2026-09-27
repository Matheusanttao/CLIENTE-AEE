import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MapPin, Pencil, Plus, Star, Trash2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { AddressForm } from '../components/AddressForm'
import { Badge, Button, Skeleton, useConfirm, useToast } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import {
  createAddress,
  deleteAddress,
  getMyAddresses,
  setPrimaryAddress,
  updateAddress,
} from '../services/addresses'
import type { AddressInput } from '../schemas'
import type { Address } from '../types'
import { cn } from '../utils/cn'
import { formatAddressLine, formatCep } from '../utils/format'

export function AddressesPage() {
  const { user } = useAuth()
  const { settings } = useSiteSettings()
  const { notify } = useToast()
  const { confirm } = useConfirm()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)
  const [saving, setSaving] = useState(false)
  const formPanelRef = useRef<HTMLDivElement>(null)

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: () => getMyAddresses(user?.id ?? ''),
    enabled: Boolean(user),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['addresses', user?.id] })

  const openForm = (address: Address | null) => {
    setEditing(address)
    setShowForm(true)
    window.requestAnimationFrame(() => {
      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
  }

  const handleSave = async (data: AddressInput & { save: boolean }) => {
    if (!user) return
    try {
      setSaving(true)
      if (editing) {
        await updateAddress(editing.id, user.id, data)
        notify('Endereço atualizado')
      } else {
        await createAddress(user.id, data)
        notify('Endereço adicionado')
      }
      await invalidate()
      setShowForm(false)
      setEditing(null)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao salvar endereço', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (addressId: string) => {
    if (!user) return
    const ok = await confirm({
      title: 'Excluir endereço',
      message: 'Tem certeza de que deseja excluir este endereço?',
      confirmLabel: 'Excluir',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await deleteAddress(addressId, user.id)
      await invalidate()
      notify('Endereço excluído')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao excluir endereço', 'error')
    }
  }

  const handleSetPrimary = async (addressId: string) => {
    if (!user) return
    try {
      await setPrimaryAddress(user.id, addressId)
      await invalidate()
      notify('Endereço principal atualizado')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao definir endereço principal', 'error')
    }
  }

  return (
    <>
      <Helmet>
        <title>{`Endereços - ${settings.store_name}`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="grid gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Meus endereços</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Gerencie os endereços usados nas suas compras.
            </p>
          </div>
          {!showForm && (
            <Button onClick={() => openForm(null)}>
              <Plus size={18} />
              Novo endereço
            </Button>
          )}
        </div>

        {showForm && (
          <div
            ref={formPanelRef}
            className="scroll-mt-28 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">{editing ? 'Editar endereço' : 'Novo endereço'}</h2>
                <p className="mt-1 text-sm text-muted">Digite o CEP para preencher rua, bairro e cidade.</p>
              </div>
              <button
                type="button"
                aria-label="Fechar formulário"
                onClick={closeForm}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-5">
              <AddressForm
                key={editing?.id ?? 'new'}
                defaultValues={
                  editing
                    ? {
                        ...editing,
                        complemento: editing.complemento ?? undefined,
                      }
                    : undefined
                }
                onSubmit={handleSave}
                submitLabel={editing ? 'Atualizar endereço' : 'Salvar endereço'}
                showSaveCheckbox={false}
                loading={saving}
              />
            </div>
            <Button variant="ghost" className="mt-3" onClick={closeForm}>
              Cancelar
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        )}

        {!isLoading && addresses.length === 0 && !showForm && (
          <div className="rounded-2xl border border-line bg-white px-6 py-14 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-mint text-brand">
              <MapPin size={24} />
            </span>
            <h2 className="mt-5 text-lg font-semibold text-ink">Nenhum endereço cadastrado</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
              Adicione um endereço para agilizar suas próximas compras.
            </p>
            <Button className="mt-6" onClick={() => openForm(null)}>
              <Plus size={18} />
              Adicionar endereço
            </Button>
          </div>
        )}

        {addresses.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {addresses.map((address) => (
              <article
                key={address.id}
                className={cn(
                  'flex flex-col rounded-2xl border bg-white p-5 transition',
                  address.principal ? 'border-brand/40' : 'border-line hover:border-[#d0d5dd]',
                  editing?.id === address.id && 'ring-4 ring-brand/15',
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'grid h-10 w-10 shrink-0 place-items-center rounded-full',
                      address.principal ? 'bg-brand-mint text-brand' : 'bg-surface text-muted',
                    )}
                  >
                    <MapPin size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="min-w-0 truncate text-base font-semibold text-ink">
                        {address.nome_destinatario}
                      </h2>
                      {address.principal && <Badge tone="promo">Principal</Badge>}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{formatAddressLine(address)}</p>
                    <p className="mt-0.5 text-sm text-muted">CEP {formatCep(address.cep)}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  {!address.principal && (
                    <Button
                      variant="secondary"
                      className="px-4 py-2.5"
                      onClick={() => handleSetPrimary(address.id)}
                    >
                      <Star size={16} />
                      Tornar principal
                    </Button>
                  )}
                  <Button variant="secondary" className="px-4 py-2.5" onClick={() => openForm(address)}>
                    <Pencil size={16} />
                    Editar
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDelete(address.id)}
                    className="ml-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-danger/15"
                  >
                    <Trash2 size={16} />
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
