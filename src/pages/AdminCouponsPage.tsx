import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pause, Play, Tag, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AdminCard, AdminEmptyState, AdminField, AdminListRow, AdminPill, AdminSectionHeader } from '../components/admin/AdminUI'
import { adminButtonClass } from '../components/admin/adminStyles'
import { Button, Input, Select, useConfirm, useToast } from '../components/ui'
import { createCoupon, deleteCoupon, getAllCoupons, updateCoupon } from '../services/admin'
import type { Coupon } from '../types'
import { formatCurrency } from '../utils/format'

export function AdminCouponsPage() {
  const { notify } = useToast()
  const { confirm } = useConfirm()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: getAllCoupons,
  })

  const handleCreate = async (formData: FormData) => {
    try {
      setSaving(true)
      await createCoupon({
        codigo: String(formData.get('codigo') ?? ''),
        tipo: String(formData.get('tipo')) as Coupon['tipo'],
        valor: Number(formData.get('valor')),
        valor_minimo: Number(formData.get('valor_minimo') ?? 0),
      })
      notify('Cupom criado')
      await queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao criar cupom', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (coupon: Coupon) => {
    try {
      await updateCoupon(coupon.codigo, { ativo: !coupon.ativo })
      notify(coupon.ativo ? 'Cupom desativado' : 'Cupom ativado')
      await queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao atualizar cupom', 'error')
    }
  }

  const handleDelete = async (codigo: string) => {
    const ok = await confirm({
      title: 'Excluir cupom',
      message: `Tem certeza que deseja excluir o cupom ${codigo}?`,
      confirmLabel: 'Excluir',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await deleteCoupon(codigo)
      notify('Cupom excluído')
      await queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao excluir cupom', 'error')
    }
  }

  const activeCount = coupons.filter((coupon) => coupon.ativo).length

  return (
    <div className="grid items-start gap-4 sm:gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <AdminCard className="xl:sticky xl:top-[92px]">
        <AdminSectionHeader title="Novo cupom" description="Crie um código de desconto para a loja." />
        <form action={handleCreate} className="grid gap-4">
          <AdminField label="Código" required hint="O cliente digita este código no carrinho.">
            <Input name="codigo" placeholder="Ex.: BEMVINDO10" autoComplete="off" required />
          </AdminField>
          <AdminField label="Tipo de desconto" required>
            <Select name="tipo" required defaultValue="percentual">
              <option value="percentual">Percentual (%)</option>
              <option value="fixo">Valor fixo (R$)</option>
            </Select>
          </AdminField>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <AdminField label="Valor" required>
              <Input name="valor" type="number" step="0.01" min="0" inputMode="decimal" placeholder="0" required />
            </AdminField>
            <AdminField label="Pedido mínimo (R$)">
              <Input
                name="valor_minimo"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="0,00"
                defaultValue={0}
              />
            </AdminField>
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Salvando...' : 'Criar cupom'}
          </Button>
        </form>
      </AdminCard>

      <AdminCard>
        <AdminSectionHeader
          title="Cupons cadastrados"
          description={
            coupons.length > 0
              ? `${coupons.length} ${coupons.length === 1 ? 'cupom' : 'cupons'} · ${activeCount} ${activeCount === 1 ? 'ativo' : 'ativos'}`
              : 'Ative, pause ou exclua seus cupons.'
          }
        />
        {isLoading && (
          <div className="grid gap-2.5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-[72px] animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        )}
        {!isLoading && coupons.length === 0 && (
          <AdminEmptyState
            icon={<Tag size={20} />}
            title="Nenhum cupom cadastrado"
            description="Crie o primeiro cupom no formulário ao lado."
          />
        )}
        <div className="grid gap-2.5">
          {coupons.map((coupon) => (
            <AdminListRow key={coupon.codigo} className="sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    coupon.ativo ? 'bg-brand-mint text-brand' : 'bg-surface text-muted'
                  }`}
                >
                  <Tag size={18} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="truncate font-mono text-sm font-semibold tracking-wide text-ink">
                      {coupon.codigo}
                    </strong>
                    <AdminPill tone={coupon.ativo ? 'success' : 'neutral'}>
                      {coupon.ativo ? 'Ativo' : 'Inativo'}
                    </AdminPill>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    {coupon.tipo === 'percentual' ? `${coupon.valor}% de desconto` : `${formatCurrency(coupon.valor)} de desconto`}
                    {' · '}
                    Pedido mínimo {formatCurrency(coupon.valor_minimo)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button
                  type="button"
                  className={adminButtonClass('secondary', 'sm', 'flex-1 sm:flex-none')}
                  onClick={() => toggleActive(coupon)}
                >
                  {coupon.ativo ? <Pause size={15} /> : <Play size={15} />}
                  {coupon.ativo ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  type="button"
                  className={adminButtonClass('danger', 'sm', 'flex-1 sm:flex-none')}
                  onClick={() => handleDelete(coupon.codigo)}
                >
                  <Trash2 size={15} />
                  Excluir
                </button>
              </div>
            </AdminListRow>
          ))}
        </div>
      </AdminCard>
    </div>
  )
}
