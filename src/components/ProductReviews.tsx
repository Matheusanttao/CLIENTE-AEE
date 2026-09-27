import type { FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button, Input, Rating, Skeleton, useToast } from './ui'
import { useAuth } from '../contexts/AuthContext'
import {
  getMyReviewForProduct,
  getProductReviews,
  hasPurchasedProduct,
  submitReview,
} from '../services/reviews'
import { formatDate } from '../utils/format'

export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth()
  const { notify } = useToast()
  const queryClient = useQueryClient()
  const [nota, setNota] = useState(5)
  const [comentario, setComentario] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => getProductReviews(productId),
  })

  const { data: myReview } = useQuery({
    queryKey: ['my-review', user?.id, productId],
    queryFn: () => getMyReviewForProduct(user!.id, productId),
    enabled: Boolean(user),
  })

  const { data: canReview = false, isLoading: checkingPurchase } = useQuery({
    queryKey: ['purchased-product', user?.id, productId],
    queryFn: () => hasPurchasedProduct(user!.id, productId),
    enabled: Boolean(user),
  })

  useEffect(() => {
    if (!myReview) return
    setNota(myReview.nota)
    setComentario(myReview.comentario ?? '')
  }, [myReview])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) {
      notify('Faca login para avaliar', 'error')
      return
    }
    if (!canReview) {
      notify('So e possivel avaliar produtos que voce ja comprou', 'error')
      return
    }

    try {
      setSaving(true)
      await submitReview({ userId: user.id, productId, nota, comentario })
      notify(myReview ? 'Avaliacao atualizada' : 'Avaliacao enviada')
      await queryClient.invalidateQueries({ queryKey: ['reviews', productId] })
      await queryClient.invalidateQueries({ queryKey: ['my-review', user.id, productId] })
      await queryClient.invalidateQueries({ queryKey: ['product'] })
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Nao foi possivel enviar a avaliacao', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!isLoading && !checkingPurchase && reviews.length === 0 && !canReview) return null

  return (
    <div className="mt-8 rounded-3xl bg-gray-50 p-6">
      <h2 className="font-black text-black">Avaliacoes</h2>

      {user && checkingPurchase ? (
        <Skeleton className="mt-4 h-28 rounded-2xl" />
      ) : user && canReview ? (
        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-sm font-semibold text-black">
            {myReview ? 'Atualizar sua avaliacao' : 'Deixe sua avaliacao'}
          </p>
          <p className="text-xs text-muted">Disponivel porque voce comprou este produto.</p>
          <label className="grid gap-2 text-sm">
            Nota
            <select
              className="rounded-2xl border-2 border-gray-300 px-4 py-3"
              value={nota}
              onChange={(event) => setNota(Number(event.target.value))}
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} estrela{value > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </label>
          <Input
            placeholder="Comentario (opcional)"
            value={comentario}
            onChange={(event) => setComentario(event.target.value)}
          />
          <Button type="submit" disabled={saving}>
            {saving ? 'Enviando...' : myReview ? 'Atualizar avaliacao' : 'Enviar avaliacao'}
          </Button>
        </form>
      ) : null}

      <div className="mt-6 grid gap-3">
        {isLoading && <Skeleton className="h-24" />}
        {reviews.map((review) => (
          <article key={review.id} className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <strong className="text-black">{review.usuarios?.nome ?? 'Cliente'}</strong>
              <Rating value={review.nota} />
            </div>
            {review.comentario && <p className="mt-2 text-sm text-gray-600">{review.comentario}</p>}
            <p className="mt-2 text-xs text-gray-400">{formatDate(review.criado_em)}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
