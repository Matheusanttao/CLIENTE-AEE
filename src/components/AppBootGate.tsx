import { useEffect, type ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import {
  dismissAppPreloader,
  preloadImage,
  updateAppPreloaderBrand,
  waitForVisualReady,
} from '../lib/appBoot'

/**
 * Mantém o splash do index.html até estilos, settings e auth estarem prontos.
 * Atualiza nome/logo da loja no splash antes de revelar a UI.
 */
export function AppBootGate({ children }: { children: ReactNode }) {
  const { loading: authLoading } = useAuth()
  const { settings, loading: settingsLoading } = useSiteSettings()

  useEffect(() => {
    updateAppPreloaderBrand(settings)
  }, [settings])

  useEffect(() => {
    if (authLoading || settingsLoading) return

    let cancelled = false

    ;(async () => {
      updateAppPreloaderBrand(settings)

      const assets: Promise<void>[] = [waitForVisualReady()]
      if (settings.logo_enabled && settings.logo_url?.trim()) {
        assets.push(preloadImage(settings.logo_url))
      }

      await Promise.all(assets)
      if (!cancelled) dismissAppPreloader()
    })()

    return () => {
      cancelled = true
    }
  }, [authLoading, settingsLoading, settings])

  useEffect(() => {
    const failSafe = window.setTimeout(() => dismissAppPreloader(), 12_000)
    return () => window.clearTimeout(failSafe)
  }, [])

  return children
}
