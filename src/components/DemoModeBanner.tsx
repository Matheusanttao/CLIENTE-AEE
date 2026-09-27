import { Info } from 'lucide-react'
import { isStoreDemoMode, STORE_DEMO_MESSAGE } from '../lib/storeMode'

/** Aviso discreto do modo demonstracao, acima do cabecalho (rola junto com a pagina). */
export function DemoModeBanner() {
  if (!isStoreDemoMode) return null

  return (
    <div role="status" className="bg-brand-soft text-ink">
      <p className="container flex items-start justify-center gap-2 py-2 text-center text-[13px] font-medium leading-snug sm:items-center">
        <Info size={16} className="mt-px shrink-0 text-brand sm:mt-0" aria-hidden />
        <span>{STORE_DEMO_MESSAGE}</span>
      </p>
    </div>
  )
}
