import {
  Boxes,
  ChevronRight,
  CreditCard,
  Info,
  Minus,
  Package,
  Plus,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FavoriteButton } from '../components/FavoriteButton'
import { PriceTag } from '../components/PriceTag'
import { ProductCard } from '../components/ProductCard'
import { ProductGallery } from '../components/ProductGallery'
import { ProductReviews } from '../components/ProductReviews'
import { ProductStars } from '../components/ProductStars'
import { Seo } from '../components/Seo'
import { Badge, Button, EmptyState, SectionHeader, Skeleton, useToast } from '../components/ui'
import { useCart } from '../contexts/CartContext'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { useProduct, useRelatedProducts } from '../hooks/useProducts'
import { isStoreDemoMode, STORE_DEMO_SHORT_MESSAGE } from '../lib/storeMode'
import {
  buildBreadcrumbJsonLd,
  buildProductDescription,
  buildProductJsonLd,
  SITE_NAME,
} from '../lib/seo'
import { availableFlavors, productRequiresFlavor } from '../services/flavors'
import { calculatePixDiscount } from '../services/orders'
import type { ProductFlavor } from '../types'
import { buildWhatsappUrl } from '../types/settings'
import { cn } from '../utils/cn'
import { formatCurrency } from '../utils/format'

const stepperButtonClass =
  'grid h-full w-11 place-items-center text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:text-muted/40 disabled:hover:bg-transparent'

const breadcrumbLinkClass = 'shrink-0 rounded-sm transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30'

const STICKY_FALLBACK_HEADER = 128 // altura aproximada do cabecalho fixo no desktop
const STICKY_GAP = 24

/** Cabecalho da loja que fica fixo no topo (position sticky/fixed), para descontar a altura dele. */
function findStickyHeader() {
  return (
    Array.from(document.querySelectorAll<HTMLElement>('header')).find((element) => {
      const position = window.getComputedStyle(element).position
      return position === 'sticky' || position === 'fixed'
    }) ?? null
  )
}

/**
 * Coluna de compra fixa no desktop, logo abaixo do cabecalho fixo (altura medida).
 * Quando ela e mais alta que a janela, o `top` fica negativo para que o fim da coluna
 * (atacado, informacoes) continue alcancavel antes de fixar.
 */
function useStickyColumn(ref: RefObject<HTMLElement | null>, key: unknown) {
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const header = findStickyHeader()
    const update = () => {
      const preferredTop = (header?.offsetHeight ?? STICKY_FALLBACK_HEADER) + STICKY_GAP
      const top = Math.min(preferredTop, window.innerHeight - element.offsetHeight - STICKY_GAP)
      element.style.setProperty('--buy-box-top', `${top}px`)
    }
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(element)
    if (header) observer?.observe(header)
    window.addEventListener('resize', update)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [ref, key])
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M16.004 3C9.38 3 4 8.384 4 15.012c0 2.188.58 4.315 1.684 6.192L4 29l7.988-1.65A12 12 0 0 0 16.004 27C22.628 27 28 21.616 28 14.988 28 8.384 22.628 3 16.004 3Zm6.62 16.972c-.276.78-1.604 1.428-2.244 1.52-.576.08-1.3.114-2.1-.132-.484-.148-1.108-.348-1.908-.68-3.356-1.452-5.54-4.816-5.708-5.04-.164-.228-1.36-1.812-1.36-3.456 0-1.644.86-2.452 1.164-2.788.304-.336.664-.42.884-.42h.64c.208 0 .484-.004.748.572.276.592.936 2.292 1.02 2.464.084.172.14.372.028.6-.108.228-.164.372-.324.572-.164.2-.344.448-.492.6-.164.172-.336.36-.144.704.192.344.852 1.404 1.828 2.276 1.256 1.12 2.312 1.468 2.656 1.632.344.164.544.14.744-.084.204-.228.864-.992 1.096-1.332.228-.344.46-.284.772-.172.316.112 2 .944 2.34 1.116.344.172.572.256.656.4.084.148.084.844-.192 1.624Z"
      />
    </svg>
  )
}

function ProductPageSkeleton() {
  return (
    <section className="container pb-12 pt-5 sm:pt-8 md:pb-16" aria-busy="true" aria-label="Carregando produto">
      <Skeleton className="h-4 w-56 rounded-full" />
      <div className="mt-5 grid gap-8 sm:mt-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-12">
        <Skeleton className="aspect-square w-full" />
        <div className="grid content-start gap-4">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-9 w-4/5 rounded-xl" />
          <Skeleton className="h-5 w-40 rounded-full" />
          <Skeleton className="mt-2 h-32 w-full" />
          <Skeleton className="h-11 w-3/5 rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </section>
  )
}

export function ProductPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { notify } = useToast()
  const { settings } = useSiteSettings()
  const { data: product, isLoading, isError } = useProduct(slug)
  const { data: related = [] } = useRelatedProducts(product)
  const [selectedFlavor, setSelectedFlavor] = useState<ProductFlavor | null>(null)
  const [quantityState, setQuantityState] = useState<{ productId: string; value: number } | null>(null)
  const buyBoxRef = useRef<HTMLDivElement>(null)
  useStickyColumn(buyBoxRef, product?.id)

  if (isLoading) return <ProductPageSkeleton />
  if (isError || !product) {
    return (
      <section className="container py-12 md:py-16">
        <EmptyState
          title="Produto não encontrado"
          description="Ele pode ter sido removido ou estar indisponível. Confira o catálogo para ver os produtos disponíveis."
        />
        <div className="mt-6 flex justify-center">
          <Link
            to="/catalogo"
            className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
          >
            Ver catálogo
          </Link>
        </div>
      </section>
    )
  }

  const flavors = availableFlavors(product.produto_sabores)
  const requiresFlavor = productRequiresFlavor(product.produto_sabores)
  // Todas as variacoes ativas (as sem estoque aparecem desabilitadas); a selecao continua restrita a `flavors`.
  const variationOptions = (product.produto_sabores ?? [])
    .filter((flavor) => flavor.ativo)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true, sensitivity: 'base' }))
  const activeFlavor = selectedFlavor && flavors.some((flavor) => flavor.id === selectedFlavor.id) ? selectedFlavor : null
  const stock = requiresFlavor ? (activeFlavor?.estoque ?? 0) : product.estoque
  const price = product.preco_promocional ?? product.preco
  const canBuy = !isStoreDemoMode && (!requiresFlavor || Boolean(activeFlavor)) && stock > 0
  const maxQuantity = Math.max(stock, 1)
  const quantity =
    quantityState?.productId === product.id ? Math.min(Math.max(quantityState.value, 1), maxQuantity) : 1
  const primaryImage = [...(product.imagens_produtos ?? [])].sort((a, b) => a.ordem - b.ordem)[0]?.url
  const seoDescription = buildProductDescription(product)

  const pixPercent = settings.pix_discount_enabled ? settings.pix_discount_percent : 0
  const pixPrice = pixPercent > 0 ? price - calculatePixDiscount(price, 0, pixPercent) : null
  const installmentsText = settings.installments_text?.trim()
  const hasWhatsapp = (settings.whatsapp_number ?? '').replace(/\D/g, '').length > 0
  const wholesaleUrl = buildWhatsappUrl(
    settings.whatsapp_number ?? '',
    `Olá! Tenho interesse no produto ${product.nome} para compra no atacado.`,
  )
  const hasRating = product.total_avaliacoes > 0
  const description = product.descricao?.trim()
  const categoryPath = `/catalogo?categoria=${encodeURIComponent(product.categoria)}`

  const details: Array<{ label: string; value: string }> = []
  if (product.marca) details.push({ label: 'Marca', value: product.marca })
  if (product.categoria) details.push({ label: 'Categoria', value: product.categoria })
  if (variationOptions.length > 0) {
    details.push({ label: 'Variações', value: variationOptions.map((flavor) => flavor.nome).join(', ') })
  }

  const infoItems: Array<{ icon: LucideIcon; text: string }> = [
    // O frete e calculado no checkout, a partir do endereco de entrega (o carrinho mostra "Calculado no checkout").
    { icon: Truck, text: 'Frete calculado no checkout, de acordo com o CEP de entrega' },
  ]
  if (settings.free_shipping_enabled) {
    const label = settings.free_shipping_label?.trim() || 'Frete grátis'
    infoItems.push({
      icon: Package,
      text:
        settings.free_shipping_threshold > 0
          ? `${label} em compras a partir de ${formatCurrency(settings.free_shipping_threshold)}`
          : label,
    })
  }
  const secureText = settings.footer_secure_text?.trim()
  if (secureText) infoItems.push({ icon: ShieldCheck, text: secureText })

  const stockStatus: { tone: 'success' | 'neutral' | 'muted'; text: string } | null =
    requiresFlavor && !activeFlavor
      ? flavors.length > 0
        ? { tone: 'neutral', text: 'Selecione uma variação para ver a disponibilidade.' }
        : null
      : stock > 0
        ? { tone: 'success', text: `Em estoque · ${stock} ${stock === 1 ? 'unidade disponível' : 'unidades disponíveis'}` }
        : { tone: 'muted', text: 'Produto esgotado no momento.' }

  const changeQuantity = (next: number) => {
    setQuantityState({ productId: product.id, value: Math.min(Math.max(next, 1), maxQuantity) })
  }

  const scrollToReviews = () => {
    document.getElementById('avaliacoes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleAdd = (goToCart = false) => {
    if (isStoreDemoMode) {
      notify(STORE_DEMO_SHORT_MESSAGE, 'error')
      return
    }
    if (requiresFlavor && !activeFlavor) {
      notify('Selecione uma variação para continuar', 'error')
      return
    }
    const result = addItem(product, quantity, activeFlavor)
    notify(
      result.message ?? (result.success ? 'Produto adicionado ao carrinho' : 'Não foi possível adicionar'),
      result.success ? 'success' : 'error',
    )
    if (result.success && goToCart) navigate('/carrinho')
  }

  return (
    <>
      <Seo
        title={`${product.nome} | ${SITE_NAME}`}
        description={seoDescription}
        path={`/produto/${product.slug}`}
        image={primaryImage}
        type="product"
        keywords={[product.nome, product.marca, product.categoria, SITE_NAME].filter(Boolean).join(', ')}
        jsonLd={[
          buildProductJsonLd(product),
          buildBreadcrumbJsonLd([
            { name: 'Início', path: '/' },
            { name: 'Catálogo', path: '/catalogo' },
            { name: product.categoria, path: categoryPath },
            { name: product.nome, path: `/produto/${product.slug}` },
          ]),
        ]}
      />

      <section className="container pb-12 pt-5 sm:pt-8 md:pb-16">
        <nav aria-label="Você está em" className="text-sm text-muted">
          <ol className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
            <li className="shrink-0">
              <Link to="/" className={breadcrumbLinkClass}>
                Início
              </Link>
            </li>
            <li aria-hidden className="flex shrink-0 text-muted/50">
              <ChevronRight size={14} />
            </li>
            <li className="shrink-0">
              <Link to="/catalogo" className={breadcrumbLinkClass}>
                Catálogo
              </Link>
            </li>
            {product.categoria && (
              <>
                <li aria-hidden className="flex shrink-0 text-muted/50">
                  <ChevronRight size={14} />
                </li>
                <li className="min-w-0 truncate">
                  <Link to={categoryPath} className={breadcrumbLinkClass}>
                    {product.categoria}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden className="hidden shrink-0 text-muted/50 sm:flex">
              <ChevronRight size={14} />
            </li>
            <li aria-current="page" className="hidden min-w-0 truncate font-medium text-ink sm:block">
              {product.nome}
            </li>
          </ol>
        </nav>

        <div className="mt-5 grid gap-x-12 gap-y-8 sm:mt-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
          {/* Galeria */}
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <ProductGallery images={product.imagens_produtos} name={product.nome} />
          </div>

          {/* Coluna de compra */}
          <div
            ref={buyBoxRef}
            className="min-w-0 lg:sticky lg:top-[var(--buy-box-top,9.5rem)] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {product.marca && <p className="text-sm font-semibold text-brand">{product.marca}</p>}
                <h1 className="mt-1.5 break-words text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl">
                  {product.nome}
                </h1>
              </div>
              <FavoriteButton productId={product.id} size="md" />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              {product.categoria && <Badge>{product.categoria}</Badge>}
              {product.destaque && <Badge tone="promo">Destaque</Badge>}
              {hasRating && (
                <button
                  type="button"
                  onClick={scrollToReviews}
                  className="group inline-flex min-h-10 items-center gap-1.5 rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                >
                  <ProductStars value={product.avaliacao_media} size={15} />
                  <span className="font-semibold text-ink">{product.avaliacao_media.toFixed(1).replace('.', ',')}</span>
                  <span className="text-muted underline-offset-2 transition-colors group-hover:text-brand group-hover:underline">
                    ({product.total_avaliacoes} {product.total_avaliacoes === 1 ? 'avaliação' : 'avaliações'})
                  </span>
                </button>
              )}
            </div>

            {/* Preco */}
            <div className="mt-6 rounded-2xl bg-surface p-5">
              <PriceTag price={product.preco} salePrice={product.preco_promocional} />
              {(pixPrice !== null || installmentsText) && (
                <div className="mt-3 grid gap-1.5 text-sm text-muted">
                  {pixPrice !== null && (
                    <p className="flex items-center gap-2">
                      <QrCode size={16} aria-hidden className="shrink-0 text-brand" />
                      <span>
                        <span className="font-semibold text-ink tabular-nums">{formatCurrency(pixPrice)}</span> no Pix
                        <span className="text-muted"> ({pixPercent.toLocaleString('pt-BR')}% de desconto)</span>
                      </span>
                    </p>
                  )}
                  {installmentsText && (
                    <p className="flex items-center gap-2">
                      <CreditCard size={16} aria-hidden className="shrink-0 text-muted" />
                      <span>{installmentsText}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Variacoes */}
            {requiresFlavor && (
              <div className="mt-6">
                <p id="variacao-label" className="text-sm font-semibold text-ink">
                  {activeFlavor ? (
                    <>
                      Variação: <span className="font-bold">{activeFlavor.nome}</span>
                    </>
                  ) : (
                    'Escolha a variação'
                  )}
                </p>
                {variationOptions.length > 0 && (
                  <div role="radiogroup" aria-labelledby="variacao-label" className="mt-3 flex flex-wrap gap-2">
                    {variationOptions.map((flavor) => {
                      const available = flavor.estoque > 0
                      const selected = activeFlavor?.id === flavor.id
                      return (
                        <button
                          key={flavor.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          aria-label={available ? flavor.nome : `${flavor.nome} (esgotada)`}
                          disabled={!available}
                          onClick={() => setSelectedFlavor(flavor)}
                          className={cn(
                            'inline-flex min-h-11 min-w-[3.25rem] items-center justify-center rounded-xl border px-4 py-2 text-sm transition-colors',
                            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20',
                            selected
                              ? 'border-brand bg-brand-mint font-semibold text-brand-hover'
                              : available
                                ? 'border-line bg-white font-medium text-ink hover:border-[#D0D5DD] hover:bg-surface'
                                : 'cursor-not-allowed border-line bg-surface font-medium text-muted/70 line-through',
                          )}
                        >
                          {flavor.nome}
                        </button>
                      )
                    })}
                  </div>
                )}
                {flavors.length === 0 && (
                  <p className="mt-3 text-sm text-muted">Todas as variações estão esgotadas no momento.</p>
                )}
              </div>
            )}

            {stockStatus && (
              <p
                className={cn(
                  'mt-5 flex items-center gap-2 text-sm',
                  stockStatus.tone === 'success' ? 'text-ink-soft' : 'text-muted',
                )}
              >
                {stockStatus.tone !== 'neutral' && (
                  <span
                    aria-hidden
                    className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      stockStatus.tone === 'success' ? 'bg-success' : 'bg-muted/50',
                    )}
                  />
                )}
                {stockStatus.text}
              </p>
            )}

            {/* Quantidade e compra */}
            <div className="mt-5 flex gap-3">
              <div
                role="group"
                aria-label="Quantidade"
                className="flex h-12 shrink-0 items-center rounded-xl border border-line bg-white"
              >
                <button
                  type="button"
                  aria-label="Diminuir quantidade"
                  disabled={!canBuy || quantity <= 1}
                  onClick={() => changeQuantity(quantity - 1)}
                  className={cn(stepperButtonClass, 'rounded-l-xl')}
                >
                  <Minus size={16} aria-hidden />
                </button>
                <output aria-live="polite" className="w-9 text-center text-sm font-semibold text-ink tabular-nums">
                  {quantity}
                </output>
                <button
                  type="button"
                  aria-label="Aumentar quantidade"
                  disabled={!canBuy || quantity >= stock}
                  onClick={() => changeQuantity(quantity + 1)}
                  className={cn(stepperButtonClass, 'rounded-r-xl')}
                >
                  <Plus size={16} aria-hidden />
                </button>
              </div>
              <Button className="h-12 min-w-0 flex-1" disabled={!canBuy} onClick={() => handleAdd(false)}>
                <ShoppingBag size={18} aria-hidden className="shrink-0" />
                <span className="min-[400px]:hidden">Adicionar</span>
                <span className="hidden min-[400px]:inline">Adicionar ao carrinho</span>
              </Button>
            </div>
            <Button variant="secondary" className="mt-3 h-12 w-full" disabled={!canBuy} onClick={() => handleAdd(true)}>
              Comprar agora
            </Button>

            {isStoreDemoMode && (
              <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-soft">
                <Info size={18} aria-hidden className="mt-0.5 shrink-0 text-muted" />
                {STORE_DEMO_SHORT_MESSAGE}
              </p>
            )}

            {/* Atacado */}
            {hasWhatsapp && (
              <div className="mt-6 rounded-2xl border border-brand-soft bg-brand-mint p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-brand">
                    <Boxes size={20} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">Compra no atacado</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted">
                      Quer comprar em quantidade? Fale com a nossa equipe pelo WhatsApp.
                    </p>
                  </div>
                </div>
                <a
                  href={wholesaleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition-colors hover:border-[#D0D5DD] hover:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
                >
                  <WhatsAppGlyph className="h-5 w-5 shrink-0 text-[#25D366]" />
                  <span className="min-[400px]:hidden">Atacado pelo WhatsApp</span>
                  <span className="hidden min-[400px]:inline">Comprar no atacado pelo WhatsApp</span>
                </a>
              </div>
            )}

            {/* Informacoes de compra */}
            <ul className="mt-6 grid gap-3 border-t border-line pt-6">
              {infoItems.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm leading-snug text-muted">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-ink-soft">
                    <Icon size={18} aria-hidden />
                  </span>
                  <span className="min-w-0">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Descricao, informacoes e avaliacoes */}
          <div className="flex min-w-0 flex-col gap-12 border-t border-line pt-10 lg:col-start-1 lg:row-start-2">
            {description && (
              <section aria-labelledby="produto-descricao">
                <h2 id="produto-descricao" className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
                  Descrição
                </h2>
                <p className="mt-4 whitespace-pre-line break-words text-[15px] leading-relaxed text-muted">
                  {description}
                </p>
              </section>
            )}

            {details.length > 0 && (
              <section aria-labelledby="produto-informacoes">
                <h2 id="produto-informacoes" className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
                  Informações do produto
                </h2>
                <dl className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
                  {details.map((item) => (
                    <div
                      key={item.label}
                      className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 px-4 py-3.5 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:px-5"
                    >
                      <dt className="text-muted">{item.label}</dt>
                      <dd className="break-words font-medium text-ink">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {/* key: remonta ao trocar de produto, para o formulario nao herdar nota/comentario do anterior */}
            <ProductReviews key={product.id} productId={product.id} />
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <div className="border-t border-line">
          <section className="container py-12 md:py-16">
            <SectionHeader
              title="Você também pode gostar"
              description={`Mais opções em ${product.categoria}.`}
              action={{ label: 'Ver mais', to: categoryPath }}
            />
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
