import { Loader2 } from 'lucide-react'
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
        'grid place-items-center gap-3 text-center',
        fullScreen ? 'min-h-screen bg-[#f4f5f2]' : 'min-h-[40vh] py-16',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-10 w-10 animate-spin text-brand" strokeWidth={2.5} />
      <p className="text-sm font-semibold text-muted">{label}</p>
    </div>
  )
}
