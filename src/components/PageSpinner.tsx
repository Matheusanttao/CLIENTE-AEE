import { cn } from '../utils/cn'

export function PageSpinner({
  fullScreen = false,
  label = 'Carregando...',
  className,
}: {
  fullScreen?: boolean
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid place-content-center justify-items-center gap-4 text-center',
        fullScreen ? 'min-h-screen bg-white' : 'min-h-[40vh] py-16',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand"
        aria-hidden
      />
      <p className="text-sm font-medium text-muted">{label}</p>
    </div>
  )
}
