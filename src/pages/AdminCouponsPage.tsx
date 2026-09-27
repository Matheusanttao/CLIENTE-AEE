import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AdminCard, AdminListRow, AdminSectionHeader } from '../components/admin/AdminUI'
import { Button, Input, Select, Skeleton, useConfirm, useToast } from '../components/ui'
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
      notify('Cupom excluido')
      await queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao excluir cupom', 'error')
    }
  }

  return (
    <div className="grid gap-3">
      <AdminCard>
        <AdminSectionHeader title="Novo cupom" description="Crie um codigo de desconto" />
        <form action={handleCreate} className="grid gap-3 md:grid-cols-2">
          <Input name="codigo" placeholder="Codigo (ex: FIT10)" required />
          <Select name="tipo" required defaultValue="percentual">
            <option value="percentual">Percentual</option>
            <option value="fixo">Valor fixo</option>
          </Select>
          <Input name="valor" type="number" step="0.01" placeholder="Valor" required />
          <Input name="valor_minimo" type="number" step="0.01" placeholder="Valor minimo" defaultValue={0} />
          <div className="flex justify-end md:col-span-2">
            <Button type="submit" disabled={saving} className="rounded-2xl">
              {saving ? 'Salvando...' : 'Criar cupom'}
            </Button>
          </div>
        </form>
      </AdminCard>

      <AdminCard>
        <AdminSectionHeader title="Cupons cadastrados" description="Ative, pause ou exclua" />
        {isLoading && <Skeleton className="h-32 rounded-2xl" />}
        <div className="grid gap-2.5">
          {coupons.map((coupon) => (
            <AdminListRow
              key={coupon.codigo}
              className="md:grid-cols-[1fr_auto_auto] md:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="font-display text-ink">{coupon.codigo}</strong>
                  <span
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${
                      coupon.ativo ? 'bg-brand-soft text-ink' : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    {coupon.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {coupon.tipo === 'percentual' ? `${coupon.valor}%` : formatCurrency(coupon.valor)} ·
                  Minimo {formatCurrency(coupon.valor_minimo)}
                </p>
              </div>
              <Button variant="secondary" onClick={() => toggleActive(coupon)}>
                {coupon.ativo ? 'Desativar' : 'Ativar'}
              </Button>
              <Button variant="danger" onClick={() => handleDelete(coupon.codigo)}>
                <Trash2 size={16} /> Excluir
              </Button>
            </AdminListRow>
          ))}
        </div>
      </AdminCard>
    </div>
  )
}
