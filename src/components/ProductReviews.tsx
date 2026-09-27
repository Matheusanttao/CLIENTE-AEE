import type { FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { useState } from 'react'
import { ProductStars } from './ProductStars'
import { Button, Skeleton, useToast } from './ui'
import { useAuth } from '../contexts/AuthContext'
import {
  getMyReviewForProduct,
  getProductReviews,
  hasPurchasedProduct,
  submitReview,
} from '../services/reviews'
import { cn } from '../utils/cn'
import { formatDate } from '../utils/format'

const ratingLabels: Record<number, string> = {
  1: 'Ruim',
  2: 'Regular',
  3: 'Bom',
  4: 'Muito bom',
  5: 'Excelente',
}

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

  // Preenche o formulario com a avaliacao existente sempre que ela chega/muda (ajuste de estado durante o render).
  const [syncedReview, setSyncedReview] = useState<typeof myReview>(undefined)
  if (myReview && myReview !== syncedReview) {
    setSyncedReview(myReview)
    setNota(myReview.nota)
    setComentario(myReview.comentario ?? '')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) {
      notify('Faça login para avaliar', 'error')
      return
    }
    if (!canReview) {
      notify('Só é possível avaliar produtos que você já comprou', 'error')
      return
    }

    try {
      setSaving(true)
      await submitReview({ userId: user.id, productId, nota, comentario })
      notify(myReview ? 'Avaliação atualizada' : 'Avaliação enviada')
      await queryClient.invalidateQueries({ queryKey: ['reviews', productId] })
      await queryClient.invalidateQueries({ queryKey: ['my-review', user.id, productId] })
      await queryClient.invalidateQueries({ queryKey: ['product'] })
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Não foi possível enviar a avaliação', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!isLoading && !checkingPurchase && reviews.length === 0 && !canReview) return null

  const average = reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.nota, 0) / reviews.length : 0

  return (
    <section id="avaliacoes" aria-labelledby="avaliacoes-titulo" className="scroll-mt-28">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <h2 id="avaliacoes-titulo" className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Avaliações
        </h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <ProductStars value={average} size={16} />
            <span className="font-semibold text-ink">{average.toFixed(1).replace('.', ',')}</span>
            <span className="text-muted">
              ({reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'})
            </span>
          </div>
        )}
      </div>

      {user && checkingPurchase ? (
        <Skeleton className="mt-5 h-40" />
      ) : user && canReview ? (
        <form onSubmit={handleSubmit} className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
          <p className="text-base font-semibold text-ink">
            {myReview ? 'Atualizar sua avaliação' : 'Deixe sua avaliação'}
          </p>
          <p className="mt-1 text-sm text-muted">Disponível porque você comprou este produto.</p>

          <div className="mt-5">
            <p id="review-nota-label" className="text-sm font-medium text-ink">
              Sua nota
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <div role="radiogroup" aria-labelledby="review-nota-label" className="-ml-1.5 flex">
                {[1, 2, 3, 4, 5].map((value) => {
                  const active = value <= nota
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={nota === value}
                      aria-label={`${value} estrela${value > 1 ? 's' : ''}`}
                      onClick={() => setNota(value)}
                      className="grid h-10 w-10 place-items-center rounded-xl transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
                    >
                      <Star
                        size={24}
                        aria-hidden
                        className={cn(active ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-muted/40')}
                      />
                    </button>
                  )
                })}
              </div>
              <span className="text-sm text-muted">{ratingLabels[nota]}</span>
            </div>
          </div>

          <label className="mt-4 grid gap-2 text-sm font-medium text-ink">
            <span>
              Comentário <span className="font-normal text-muted">(opcional)</span>
            </span>
            <textarea
              rows={3}
              placeholder="Conte o que achou do produto"
              value={comentario}
              onChange={(event) => setComentario(event.target.value)}
              className="w-full resize-y rounded-xl border border-line bg-white px-4 py-3 text-sm font-normal text-ink outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand/15"
            />
          </label>

          <Button type="submit" disabled={saving} className="mt-5 w-full sm:w-auto">
            {saving ? 'Enviando...' : myReview ? 'Atualizar avaliação' : 'Enviar avaliação'}
          </Button>
        </form>
      ) : null}

      <div className="mt-5 grid gap-3">
        {isLoading && (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        )}
        {!isLoading && reviews.length === 0 && canReview && (
          <p className="rounded-2xl border border-dashed border-line bg-surface/60 px-5 py-6 text-center text-sm text-muted">
            Este produto ainda não tem avaliações. Seja a primeira pessoa a avaliar.
          </p>
        )}
        {reviews.map((review) => {
          const author = review.usuarios?.nome?.trim() || 'Cliente'
          return (
            <article key={review.id} className="rounded-2xl border border-line bg-white p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-mint text-sm font-semibold text-brand-hover"
                >
                  {author.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <p className="truncate text-sm font-semibold text-ink">{author}</p>
                    <time dateTime={review.criado_em} className="text-xs text-muted">
                      {formatDate(review.criado_em)}
                    </time>
                  </div>
                  <ProductStars value={review.nota} size={14} className="mt-1" />
                  {review.comentario && (
                    <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-relaxed text-muted">
                      {review.comentario}
                    </p>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
