import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../utils/cn'

/** Grade padrao de produtos da loja (catalogo, favoritos). */
export function CatalogProductGrid({
  children,
  className,
  busy = false,
}: {
  children: ReactNode
  className?: string
  busy?: boolean
}) {
  return (
    <div
      aria-busy={busy || undefined}
      className={cn(
        'grid grid-cols-2 gap-3 transition-opacity duration-200 sm:gap-5',
        busy && 'pointer-events-none opacity-60',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Bloco de carregamento (o Skeleton do ui.tsx fixa rounded-2xl e o cn nao faz merge de classes). */
function Bone({ className }: { className: string }) {
  return <div className={cn('animate-pulse bg-surface', className)} />
}

/** Skeleton no mesmo formato do ProductCard (foto quadrada, marca, nome, preco e botao de largura total). */
export function CatalogProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white" aria-hidden="true">
      <Bone className="aspect-square w-full" />
      <div className="grid gap-2.5 p-3 sm:p-4">
        <Bone className="h-3 w-1/3 rounded-full" />
        <Bone className="h-4 w-full rounded-full" />
        <Bone className="h-4 w-2/3 rounded-full" />
        <Bone className="mt-2 h-6 w-1/2 rounded-full" />
        <Bone className="mt-1 h-10 w-full rounded-xl sm:h-11" />
      </div>
    </div>
  )
}

export function CatalogProductSkeletons({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <CatalogProductSkeleton key={index} />
      ))}
    </>
  )
}

/** Estado vazio com icone e acoes (o EmptyState do ui.tsx nao aceita acoes). */
export function CatalogEmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface/60 px-6 py-12 text-center sm:py-16">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-line bg-white text-ink-soft">
        <Icon size={24} strokeWidth={1.75} />
      </span>
      <h2 className="mt-5 text-lg font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-muted">{description}</p>
      {children && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{children}</div>}
    </div>
  )
}

/** Link com aparencia de botao (evita <a><button> aninhados). */
export function CatalogLinkButton({
  to,
  children,
  variant = 'primary',
  className,
}: {
  to: string
  children: ReactNode
  variant?: 'primary' | 'secondary'
  className?: string
}) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20',
        variant === 'primary' && 'bg-brand text-white shadow-sm hover:bg-brand-hover',
        variant === 'secondary' && 'border border-line bg-white text-ink hover:border-[#D0D5DD] hover:bg-surface',
        className,
      )}
    >
      {children}
    </Link>
  )
}
