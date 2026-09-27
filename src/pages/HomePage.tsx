import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  ArrowRight,
  CreditCard,
  Headphones,
  Leaf,
  Percent,
  ShieldCheck,
  Truck,
  Zap,
} from 'lucide-react'
import { ProductCard } from '../components/ProductCard'
import { SectionCarousel } from '../components/SectionCarousel'
import { Seo } from '../components/Seo'
import { TestimonialCard } from '../components/TestimonialCard'
import { Button, EmptyState, Input, Skeleton, useToast } from '../components/ui'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { useAvailableProductCategories, useBestSellingProducts, useProducts } from '../hooks/useProducts'
import { testimonials } from '../lib/constants'
import {
  buildLocalBusinessJsonLd,
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
} from '../lib/seo'
import { subscribeNewsletter } from '../services/newsletter'

export function HomePage() {
  const { data: bestSelling = [], isLoading } = useBestSellingProducts()
  const { data: catalogData, isLoading: isLoadingCatalog } = useProducts({ page: 1 })
  const catalogProducts = (catalogData?.products ?? []).slice(0, 12)
  const { data: availableCategories = [] } = useAvailableProductCategories()
  const { settings } = useSiteSettings()
  const availableCategorySet = new Set(availableCategories)
  const visibleCategories = settings.categories.filter((category) => availableCategorySet.has(category.name))
  const { notify } = useToast()
  const [newsletterLoading, setNewsletterLoading] = useState(false)

  const handleNewsletter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '')
    try {
      setNewsletterLoading(true)
      await subscribeNewsletter(email)
      notify('E-mail cadastrado com sucesso!')
      event.currentTarget.reset()
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
        <div className="bg-brand px-4 py-2.5 text-center text-sm font-bold text-ink">
          {settings.promo_banner_text}
        </div>
      )}

      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-y-0 right-0 w-full md:w-3/5 lg:w-1/2">
          <img
            src={settings.hero_image_url}
            alt={settings.store_name}
            className="h-full w-full object-cover object-top opacity-30 md:opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent md:via-ink/40" />
        </div>
        <div className="absolute -right-32 top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full bg-brand/20 blur-[120px]" />
        <div className="container relative z-10 flex min-h-[520px] flex-col justify-center py-16 md:py-24">
          <span className="inline-flex w-fit items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
            <Zap size={13} fill="currentColor" /> {settings.hero_eyebrow}
          </span>
          <h1 className="mt-6 max-w-4xl font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            {settings.hero_title}
            <br />
            <span className="text-brand">{settings.hero_title_highlight}</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-300 md:text-lg">
            {settings.hero_subtitle}
          </p>
          <div className="mt-9">
            <Link to="/catalogo">
              <Button className="px-8 py-4 text-sm">{settings.hero_cta_label}</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <div className="container grid gap-3 py-7 md:grid-cols-4">
          <TrustItem icon={<ShieldCheck size={22} />} title={settings.trust_1_title} text={settings.trust_1_text} />
          <TrustItem icon={<Truck size={22} />} title={settings.trust_2_title} text={settings.trust_2_text} />
          <TrustItem icon={<CreditCard size={22} />} title={settings.trust_3_title} text={settings.trust_3_text} />
          <TrustItem icon={<Headphones size={22} />} title={settings.trust_4_title} text={settings.trust_4_text} />
        </div>
      </section>

      <section className="container py-14">
        <SectionHeader title="Mais" highlight="vendidos" to="/catalogo" />
        {isLoading ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : bestSelling.length > 0 ? (
          <SectionCarousel>
            {bestSelling.map((product) => (
              <div key={product.id} className="min-w-[225px] max-w-[225px]">
                <ProductCard product={product} />
              </div>
            ))}
          </SectionCarousel>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="Nenhum produto disponível"
              description="Marque produtos como destaque no painel administrativo."
            />
          </div>
        )}
      </section>

      <section className="container pb-14">
        <div className="grid gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-ink to-ink-soft px-8 py-9 text-white shadow-soft md:grid-cols-3">
          <BenefitBand icon={<Percent size={24} />} title={settings.benefit_pix_title} text={settings.benefit_pix_text} />
          <BenefitBand
            icon={<Truck size={24} />}
            title={settings.benefit_shipping_title}
            text={settings.benefit_shipping_text}
          />
          <BenefitBand
            icon={<CreditCard size={24} />}
            title={settings.benefit_card_title}
            text={settings.benefit_card_text}
          />
        </div>
      </section>

      <section className="container pb-14">
        <div className="max-w-3xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Suplementos em Betim
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted md:text-lg">
            A Passarim Suplementos é a loja de suplementos em Betim para quem busca whey protein, creatina,
            pré-treino, vitaminas e acessórios fitness. Compre online com entrega rápida na região
            metropolitana de Belo Horizonte ou envio para todo o Brasil.
          </p>
          <Link to="/catalogo" className="mt-6 inline-flex">
            <Button variant="secondary" className="gap-2">
              Ver catálogo
              <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </section>

      {visibleCategories.length > 0 && (
        <section className="container pb-14">
          <SectionHeader title="Categorias em" highlight="destaque" to="/catalogo" />
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            {visibleCategories.map((category) => (
              <Link
                key={category.name}
                to={`/catalogo?categoria=${encodeURIComponent(category.name)}`}
                className="group w-[calc(50%-0.5rem)] max-w-[160px] rounded-2xl border border-line bg-white p-4 text-center shadow-card transition duration-300 hover:-translate-y-1.5 hover:border-ink/10 hover:shadow-soft sm:w-36"
              >
                <div className="mx-auto grid h-28 place-items-center overflow-hidden rounded-xl bg-surface">
                  <img
                    src={category.image}
                    alt={category.label}
                    className="h-24 w-24 rounded-lg object-cover transition duration-500 group-hover:scale-110"
                  />
                </div>
                <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-ink">
                  {category.label}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container pb-14">
        <SectionHeader title="Produtos da" highlight="loja" to="/catalogo" />
        {isLoadingCatalog ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton key={index} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : catalogProducts.length > 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {catalogProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState
              title="Nenhum produto disponível"
              description="Cadastre produtos no painel administrativo para exibi-los aqui."
            />
          </div>
        )}
        {catalogProducts.length > 0 && (
          <div className="mt-8 flex justify-center">
            <Link to="/catalogo">
              <Button variant="secondary" className="gap-2">
                Ver todos os produtos
                <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        )}
      </section>

      <section className="bg-ink py-16 text-white">
        <div className="container">
          <div className="text-center">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand">Depoimentos</span>
            <h2 className="mt-3 font-display text-3xl font-bold">
              O que nossos <span className="text-brand">clientes</span> dizem
            </h2>
          </div>
          <div className="mt-9">
            <SectionCarousel>
              {testimonials.map((testimonial) => (
                <TestimonialCard key={testimonial.name} {...testimonial} />
              ))}
            </SectionCarousel>
          </div>
        </div>
      </section>

      <section className="bg-ink pb-16 text-white">
        <div className="container">
          <div className="grid gap-7 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-transparent p-8 md:grid-cols-[1fr_1.2fr] md:items-center md:p-10">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand text-ink">
                <Leaf size={28} />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold">{settings.newsletter_title}</h2>
                <p className="mt-1 text-sm text-gray-400">{settings.newsletter_subtitle}</p>
              </div>
            </div>
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleNewsletter}>
              <Input
                className="border-white/10 bg-white/10 text-white placeholder:text-gray-400 focus:border-brand focus:ring-brand/20"
                type="email"
                name="email"
                placeholder="Seu melhor e-mail"
                required
              />
              <Button type="submit" className="shrink-0 px-8" disabled={newsletterLoading}>
                {newsletterLoading ? 'Enviando...' : 'Cadastrar'}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}

function BenefitBand({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand/15 text-brand">{icon}</span>
      <span>
        <strong className="block text-sm font-semibold">{title}</strong>
        <small className="text-xs text-gray-400">{text}</small>
      </span>
    </div>
  )
}

function TrustItem({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 md:border-r md:border-line last:md:border-r-0">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface text-ink">{icon}</span>
      <span>
        <strong className="block text-xs font-semibold text-ink">{title}</strong>
        <small className="text-[11px] text-muted">{text}</small>
      </span>
    </div>
  )
}

function SectionHeader({ title, highlight, to }: { title: string; highlight: string; to: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="font-display text-3xl font-bold text-ink">
        {title} <span className="text-brand-hover">{highlight}</span>
      </h2>
      <Link
        to={to}
        className="group flex shrink-0 items-center gap-1.5 text-sm font-semibold text-ink transition hover:text-brand-hover"
      >
        Ver todos <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}
