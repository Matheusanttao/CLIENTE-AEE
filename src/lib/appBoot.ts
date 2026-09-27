const READY_CLASS = 'app-ready'
const PRELOADER_ID = 'app-preloader'

export type SplashBrand = {
  store_name?: string
  store_name_short?: string
  store_tagline?: string
  logo_enabled?: boolean
  logo_url?: string
  logo_show_text?: boolean
  color_brand?: string
  color_ink?: string
}

export function isAppReady(): boolean {
  return document.documentElement.classList.contains(READY_CLASS)
}

/** Aguarda fontes (com timeout) e dois frames de paint antes de revelar a UI. */
export async function waitForVisualReady(timeoutMs = 2500): Promise<void> {
  const fonts =
    'fonts' in document
      ? Promise.race([
          document.fonts.ready.then(() => undefined),
          new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
        ])
      : Promise.resolve()

  await fonts

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

export function preloadImage(url: string, timeoutMs = 4000): Promise<void> {
  const src = url.trim()
  if (!src) return Promise.resolve()

  return new Promise((resolve) => {
    const img = new Image()
    const done = () => resolve()
    const timer = window.setTimeout(done, timeoutMs)
    img.onload = () => {
      window.clearTimeout(timer)
      done()
    }
    img.onerror = () => {
      window.clearTimeout(timer)
      done()
    }
    img.decoding = 'async'
    img.src = src
  })
}

/** Atualiza nome, tagline e logo do splash com os dados da loja. */
export function updateAppPreloaderBrand(brand: SplashBrand): void {
  const root = document.getElementById(PRELOADER_ID)
  if (!root) return

  const brandColor = brand.color_brand?.trim() || '#c4f000'
  const inkColor = brand.color_ink?.trim() || '#0d0f12'
  root.style.setProperty('--splash-brand', brandColor)
  root.style.setProperty('--splash-ink', inkColor)
  root.style.background = `
    radial-gradient(circle at 20% 0%, color-mix(in srgb, ${brandColor} 18%, transparent), transparent 42%),
    radial-gradient(circle at 90% 100%, color-mix(in srgb, ${brandColor} 8%, transparent), transparent 40%),
    ${inkColor}
  `

  const name =
    brand.store_name_short?.trim() ||
    brand.store_name?.trim() ||
    'Loja'
  const tagline = brand.store_tagline?.trim() || ''
  const logoUrl = brand.logo_url?.trim() || ''
  const logoEnabled = brand.logo_enabled !== false && Boolean(logoUrl)
  const showText = brand.logo_show_text !== false || !logoEnabled

  const logoImg = root.querySelector<HTMLImageElement>('[data-splash-logo]')
  const mark = root.querySelector<HTMLElement>('[data-splash-mark]')
  const brandEl = root.querySelector<HTMLElement>('[data-splash-brand]')
  const tagEl = root.querySelector<HTMLElement>('[data-splash-tag]')
  const textBlock = root.querySelector<HTMLElement>('[data-splash-text]')

  if (logoImg && mark) {
    if (logoEnabled) {
      logoImg.src = logoUrl
      logoImg.alt = brand.store_name?.trim() || name
      logoImg.hidden = false
      mark.hidden = true
    } else {
      logoImg.hidden = true
      logoImg.removeAttribute('src')
      mark.hidden = false
    }
  }

  if (brandEl) brandEl.textContent = name
  if (tagEl) {
    tagEl.textContent = tagline
    tagEl.hidden = !tagline
  }
  if (textBlock) textBlock.hidden = !showText

  const title = brand.store_name?.trim()
  if (title) document.title = title
}

/** Remove o splash e libera o #root. Idempotente. */
export function dismissAppPreloader(): void {
  if (isAppReady()) return

  document.documentElement.classList.add(READY_CLASS)

  const el = document.getElementById(PRELOADER_ID)
  if (!el) return

  el.classList.add('is-done')
  const remove = () => el.remove()
  el.addEventListener('transitionend', remove, { once: true })
  window.setTimeout(remove, 450)
}
