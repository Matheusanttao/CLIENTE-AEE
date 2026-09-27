import { supabase } from '../lib/supabase'
import {
  mergeSiteSettings,
  type SiteSettings,
} from '../types/settings'

const SETTINGS_ID = 1
export const SITE_SETTINGS_CACHE_KEY = 'm-ecommerce:site-settings:v1'

export function readCachedSiteSettings(): SiteSettings | undefined {
  try {
    const raw = localStorage.getItem(SITE_SETTINGS_CACHE_KEY)
    if (!raw) return undefined
    return mergeSiteSettings(JSON.parse(raw) as Partial<SiteSettings>)
  } catch {
    return undefined
  }
}

export function writeCachedSiteSettings(settings: SiteSettings) {
  try {
    localStorage.setItem(SITE_SETTINGS_CACHE_KEY, JSON.stringify(settings))
  } catch {
    // quota / private mode — ignora
  }
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('config')
    .eq('id', SETTINGS_ID)
    .maybeSingle()

  if (error) throw error

  return mergeSiteSettings((data?.config ?? null) as Partial<SiteSettings> | null)
}

export async function saveSiteSettings(config: SiteSettings): Promise<SiteSettings> {
  const payload = {
    id: SETTINGS_ID,
    config,
    atualizado_em: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('site_settings')
    .upsert(payload)
    .select('config')
    .single()

  if (error) throw error
  const saved = mergeSiteSettings((data?.config ?? config) as Partial<SiteSettings>)
  writeCachedSiteSettings(saved)
  return saved
}
