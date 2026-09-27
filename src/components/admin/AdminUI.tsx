import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export function AdminCard({
  children,
  className,
  padding = 'md',
}: {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'none'
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_0_rgba(13,15,18,0.04),0_12px_28px_-24px_rgba(13,15,18,0.18)]',
        padding === 'sm' && 'p-3',
        padding === 'md' && 'p-4',
        padding === 'lg' && 'p-5',
        padding === 'none' && 'p-0',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function AdminSectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <h2 className="font-display text-[0.95rem] font-bold tracking-tight text-ink sm:text-base">
          {title}
        </h2>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function AdminListRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'grid gap-2 rounded-xl border border-transparent bg-[#f7f8f5] px-3 py-2.5 transition hover:border-black/[0.06] hover:bg-[#f2f3ef]',
        className,
      )}
    >
      {children}
    </div>
  )
}
