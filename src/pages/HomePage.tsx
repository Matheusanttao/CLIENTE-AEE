import { useEffect, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import {
  ArrowRight,
  CreditCard,
  Mail,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Store,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import { HomeCategoryShowcase } from '../components/HomeCategoryShowcase'
import { HomeCta } from '../components/HomeCta'
import { HomeHero } from '../components/HomeHero'
import { HomeWholesale } from '../components/HomeWholesale'
import { isHomeCollectionCategory } from '../components/homeCollections'
import { ProductCard } from '../components/ProductCard'
import { SectionCarousel } from '../components/SectionCarousel'
import { Seo } from '../components/Seo'
import { Button, EmptyState, Input, SectionHeader, useToast } from '../components/ui'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { useAvailableProductCategories, useBestSellingProducts, useProducts } from '../hooks/useProducts'
import {
  buildLocalBusinessJsonLd,
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
} from '../lib/seo'
import { subscribeNewsletter } from '../services/newsletter'
import type { SiteSettings } from '../types/settings'
import { cn } from '../utils/cn'

type InfoItem = { icon: LucideIcon; title: string; text: string }

export function HomePage() {
  const { data: bestSelling = [], isLoading } = useBestSellingProducts()
  const { data: catalogData, isLoading: isLoadingCatalog } = useProducts({ page: 1 })
  const catalogProducts = (catalogData?.products ?? []).slice(0, 12)
  const { data: availableCategories = [] } = useAvailableProductCategories()
  const { settings } = useSiteSettings()
  const availableCategorySet = new Set(availableCategories)
  const visibleCategories = settings.categories.filter((category) => availableCategorySet.has(category.name))
  // Tênis e Perfumes ja aparecem como blocos fixos no banner; a vitrine so aparece quando acrescenta algo.
  const showcaseCategories = visibleCategories.every(isHomeCollectionCategory) ? [] : visibleCategories
  const { notify } = useToast()
  const [newsletterLoading, setNewsletterLoading] = useState(false)
  const { hash } = useLocation()

  // Links como "/#atacado" vindos de outras paginas: rola ate a secao depois que a home monta.
  useEffect(() => {
    if (!hash) return
    const frame = window.requestAnimationFrame(() => {
      let id = hash.slice(1)
      try {
        id = decodeURIComponent(id)
      } catch {
        // hash malformado: usa o valor bruto
      }
      document.getElementById(id)?.scrollIntoView({ block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [hash])

  const handleNewsletter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Guarda o form antes do await: o React limpa event.currentTarget depois do handler.
    const formElement = event.currentTarget
    const email = String(new FormData(formElement).get('email') ?? '')
    try {
      setNewsletterLoading(true)
      await subscribeNewsletter(email)
      notify('E-mail cadastrado com sucesso!')
      formElement.reset()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao cadastrar e-mail', 'error')
    } finally {
      setNewsletterLoading(false)
    }
  }

  return (
    <>
      <Seo
        title={settings.meta_title}
        description={settings.meta_description}
        path="/"
        image={settings.hero_image_url || settings.logo_url}
        jsonLd={[
          buildOrganizationJsonLd(settings),
          buildWebsiteJsonLd(settings),
          buildLocalBusinessJsonLd(settings),
        ]}
      />

      {settings.promo_banner_enabled && settings.promo_banner_text && (
        <div className="bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white">
          {settings.promo_banner_text}
        </div>
      )}

      <HomeHero categories={visibleCategories} />

      <TrustStrip settings={settings} />

      <HomeCategoryShowcase categories={showcaseCategories} />

      <section className="container pt-12 md:pt-16">
        {!isLoading && bestSelling.length === 0 ? (
          <>
            <SectionHeader title="Mais vendidos" />
            <div className="mt-6">
              <EmptyState
                title="Nenhum produto disponível"
                description="Marque produtos como destaque no painel administrativo."
              />
            </div>
          </>
        ) : (
          <SectionCarousel
            label="Mais vendidos"
            header={<SectionHeader title="Mais vendidos" action={{ label: 'Ver todos', to: '/catalogo' }} />}
          >
            {isLoading
              ? Array.from({ length: 4 }, (_, index) => <ProductCardSkeleton key={index} />)
              : bestSelling.map((product) => <ProductCard key={product.id} product={product} />)}
          </SectionCarousel>
        )}
      </section>

      <HomeWholesale />

      <section className="container pt-12 md:pt-16">
        <SectionHeader title="Produtos da loja" />
        {isLoadingCatalog ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : catalogProducts.length > 0 ? (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {catalogProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="mt-8 flex justify-center sm:mt-10">
              <HomeCta to="/catalogo" variant="secondary" size="lg">
                Ver todos os produtos
                <ArrowRight size={16} aria-hidden />
              </HomeCta>
            </div>
          </>
        ) : (
          <div className="mt-6">
            <EmptyState
              title="Nenhum produto disponível"
              description="Cadastre produtos no painel administrativo para exibi-los aqui."
            />
          </div>
        )}
      </section>

      <BenefitsBand settings={settings} />

      <section className="container py-12 md:py-16">
        <div className="grid items-center gap-6 rounded-2xl border border-line bg-white p-6 shadow-card sm:p-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-10">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-white shadow-brand" aria-hidden>
              <Mail size={22} />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{settings.newsletter_title}</h2>
              {settings.newsletter_subtitle && (
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{settings.newsletter_subtitle}</p>
              )}
            </div>
          </div>
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleNewsletter}>
            <label htmlFor="newsletter-email" className="sr-only">
              Seu e-mail
            </label>
            <Input
              id="newsletter-email"
              className="h-12 sm:flex-1"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Seu melhor e-mail"
              required
            />
            <Button type="submit" className="h-12 shrink-0 sm:px-8" disabled={newsletterLoading}>
              {newsletterLoading ? 'Enviando...' : 'Cadastrar'}
            </Button>
          </form>
        </div>
      </section>
    </>
  )
}

/** Faixa de confianca logo abaixo do banner (textos editaveis em Configurações). */
function TrustStrip({ settings }: { settings: SiteSettings }) {
  const items: InfoItem[] = [
    { icon: Store, title: settings.trust_1_title, text: settings.trust_1_text },
    { icon: Truck, title: settings.trust_2_title, text: settings.trust_2_text },
    { icon: ShieldCheck, title: settings.trust_3_title, text: settings.trust_3_text },
    { icon: MessageCircle, title: settings.trust_4_title, text: settings.trust_4_text },
  ].filter((item) => item.title?.trim())

  if (items.length === 0) return null

  return (
    <section className="container mt-10 sm:mt-14" aria-label="Por que comprar com a gente">
      <ul
        className={cn(
          'grid gap-px overflow-hidden rounded-2xl border border-line bg-line',
          items.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
          items.length === 3 && 'lg:grid-cols-3',
          items.length === 4 && 'lg:grid-cols-4',
        )}
      >
        {items.map(({ icon: Icon, title, text }, index) => (
          <li
            key={`${index}-${title}`}
            className={cn(
              'flex flex-col gap-3 bg-white p-4 sm:flex-row sm:items-center sm:gap-3.5 sm:p-5',
              items.length > 1 && items.length % 2 === 1 && index === items.length - 1 && 'col-span-2 lg:col-span-1',
            )}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-white shadow-brand" aria-hidden>
              <Icon size={19} />
            </span>
            <span className="min-w-0">
              <strong className="block text-sm font-semibold leading-snug text-ink">{title}</strong>
              {text && <span className="mt-0.5 block text-xs leading-relaxed text-muted sm:text-[13px]">{text}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Vantagens de pagamento/frete: cada item so aparece quando o recurso esta ativo em Configurações. */
function BenefitsBand({ settings }: { settings: SiteSettings }) {
  const items: InfoItem[] = []
  if (settings.pix_discount_enabled && settings.benefit_pix_title?.trim()) {
    items.push({ icon: QrCode, title: settings.benefit_pix_title, text: settings.benefit_pix_text })
  }
  if (settings.free_shipping_enabled && settings.benefit_shipping_title?.trim()) {
    items.push({ icon: Truck, title: settings.benefit_shipping_title, text: settings.benefit_shipping_text })
  }
  const cardTitle = settings.benefit_card_title?.trim() || settings.installments_text?.trim()
  if (cardTitle) {
    items.push({ icon: CreditCard, title: cardTitle, text: settings.benefit_card_text })
  }

  if (items.length === 0) return null

  return (
    <section className="container pt-12 md:pt-16" aria-label="Formas de pagamento e entrega">
      <ul
        className={cn(
          'grid gap-5 rounded-2xl bg-ink p-6 shadow-soft sm:p-8',
          items.length === 2 && 'sm:grid-cols-2 sm:gap-8',
          items.length === 3 && 'md:grid-cols-3 md:gap-8',
        )}
      >
        {items.map(({ icon: Icon, title, text }, index) => (
          <li key={`${index}-${title}`} className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-white shadow-brand" aria-hidden>
              <Icon size={22} />
            </span>
            <span className="min-w-0">
              <strong className="block text-[15px] font-bold text-white">{title}</strong>
              {text && <span className="mt-0.5 block text-sm leading-relaxed text-white/70">{text}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Placeholder no mesmo formato do ProductCard (foto quadrada + textos + botao). */
function ProductCardSkeleton() {
  return (
    <div className="h-full overflow-hidden rounded-2xl border border-line bg-white" aria-hidden>
      <div className="aspect-square animate-pulse bg-surface" />
      <div className="space-y-2.5 p-3 sm:p-4">
        <div className="h-3 w-1/3 animate-pulse rounded-md bg-surface" />
        <div className="h-4 w-4/5 animate-pulse rounded-md bg-surface" />
        <div className="h-5 w-2/5 animate-pulse rounded-md bg-surface" />
        <div className="mt-4 h-10 w-full animate-pulse rounded-xl bg-surface sm:h-11" />
      </div>
    </div>
  )
}
