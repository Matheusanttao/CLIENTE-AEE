/* eslint-disable react-refresh/only-export-components */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { faviconCloudinaryUrl } from '../lib/cloudinary'
import {
  getSiteSettings,
  readCachedSiteSettings,
  saveSiteSettings,
  writeCachedSiteSettings,
} from '../services/settings'
import {
  buildWhatsappUrl,
  defaultSiteSettings,
  lightenHex,
  type SiteSettings,
} from '../types/settings'

interface SiteSettingsContextValue {
  settings: SiteSettings
  loading: boolean
  whatsappUrl: string
  saveSettings: (next: SiteSettings) => Promise<SiteSettings>
  refreshSettings: () => Promise<void>
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined)

function applyTheme(settings: SiteSettings) {
  const root = document.documentElement
  root.style.setProperty('--color-brand', settings.color_brand)
  root.style.setProperty('--color-brand-hover', settings.color_brand_hover)
  root.style.setProperty('--color-brand-soft', lightenHex(settings.color_brand, 0.72))
  root.style.setProperty('--color-brand-mint', lightenHex(settings.color_brand, 0.88))
  root.style.setProperty('--color-ink', settings.color_ink)
  root.style.setProperty('--color-ink-soft', lightenHex(settings.color_ink, 0.08))
  root.style.setProperty('--color-promo', settings.color_promo)
}

function upsertLink(rel: string, href: string, type?: string) {
  let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    document.head.appendChild(link)
  }
  if (type) link.type = type
  else link.removeAttribute('type')
  link.href = href
}

function applyFavicon(settings: SiteSettings) {
  const logoUrl = settings.logo_url?.trim()
  const useLogo = settings.logo_as_favicon !== false && Boolean(logoUrl)

  if (useLogo && logoUrl) {
    const icon = faviconCloudinaryUrl(logoUrl, 64)
    const touch = faviconCloudinaryUrl(logoUrl, 180)
    upsertLink('icon', icon, 'image/png')
    upsertLink('shortcut icon', icon, 'image/png')
    upsertLink('apple-touch-icon', touch)
    return
  }

  upsertLink('icon', '/favicon.svg', 'image/svg+xml')
  upsertLink('shortcut icon', '/favicon.svg', 'image/svg+xml')
  const apple = document.head.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
  if (apple) apple.href = '/favicon.svg'
}

function preloadLogo(url: string) {
  if (!url.trim()) return
  const img = new Image()
  img.decoding = 'async'
  img.src = url
}

function themeSignature(settings: SiteSettings) {
  return [
    settings.color_brand,
    settings.color_brand_hover,
    settings.color_ink,
    settings.color_promo,
    settings.logo_url,
    settings.logo_as_favicon,
  ].join('|')
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [cached] = useState(() => {
    const value = readCachedSiteSettings()
    if (value) {
      applyTheme(value)
      applyFavicon(value)
      preloadLogo(value.logo_url)
    }
    return value
  })
  const appliedSig = useRef(cached ? themeSignature(cached) : '')

  const { data, isPending, isError } = useQuery({
    queryKey: ['site-settings'],
    queryFn: getSiteSettings,
    staleTime: 5 * 60_000,
    gcTime: 24 * 60 * 60_000,
    initialData: cached,
    initialDataUpdatedAt: cached ? Date.now() - 60_000 : undefined,
    retry: 2,
  })

  const settings = data ?? cached ?? defaultSiteSettings
  const loading = !cached && isPending && !isError

  // Aplica tema de forma sincrona (antes dos effects filhos) para o splash nao revelar com cores default.
  const nextSig = themeSignature(settings)
  if (nextSig !== appliedSig.current) {
    appliedSig.current = nextSig
    applyTheme(settings)
    applyFavicon(settings)
  }

  useEffect(() => {
    if (!data) return
    writeCachedSiteSettings(data)
    preloadLogo(data.logo_url)
  }, [data])

  const value = useMemo<SiteSettingsContextValue>(
    () => ({
      settings,
      loading,
      whatsappUrl: buildWhatsappUrl(settings.whatsapp_number, settings.whatsapp_message),
      saveSettings: async (next) => {
        const saved = await saveSiteSettings(next)
        queryClient.setQueryData(['site-settings'], saved)
        applyTheme(saved)
        applyFavicon(saved)
        appliedSig.current = themeSignature(saved)
        writeCachedSiteSettings(saved)
        preloadLogo(saved.logo_url)
        return saved
      },
      refreshSettings: async () => {
        await queryClient.invalidateQueries({ queryKey: ['site-settings'] })
      },
    }),
    [settings, loading, queryClient],
  )

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext)
  if (!context) throw new Error('useSiteSettings precisa estar dentro de SiteSettingsProvider')
  return context
}
