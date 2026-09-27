import { AlertTriangle } from 'lucide-react'
import { isStoreDemoMode, STORE_DEMO_MESSAGE } from '../lib/storeMode'

export function DemoModeBanner() {
  if (!isStoreDemoMode) return null

  return (
    <div
      role="status"
      className="sticky top-0 z-[60] border-b border-amber-500/30 bg-amber-400 px-4 py-2.5 text-center text-sm font-semibold text-ink shadow-sm"
    >
      <span className="inline-flex items-center justify-center gap-2">
        <AlertTriangle size={16} className="shrink-0" aria-hidden />
        <span>{STORE_DEMO_MESSAGE}</span>
      </span>
    </div>
  )
}
