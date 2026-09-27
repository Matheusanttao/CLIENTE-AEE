import { Check, ChevronDown, ChevronRight, CircleAlert, Search, SearchX, SlidersHorizontal, X } from 'lucide-react'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CatalogEmptyState,
  CatalogProductGrid,
  CatalogProductSkeletons,
} from '../components/CatalogGrid'
import { ProductCard } from '../components/ProductCard'
import { Seo } from '../components/Seo'
import { Button, Pagination, Select } from '../components/ui'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { useAvailableProductBrands, useAvailableProductCategories, useProducts } from '../hooks/useProducts'
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd, SITE_NAME } from '../lib/seo'
import type { SiteCategory } from '../types/settings'
import { cn } from '../utils/cn'
import { formatCurrency } from '../utils/format'

const sortOptions = [
  { value: '', label: 'Mais recentes' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
  { value: 'rating', label: 'Melhor avaliação' },
]

/** Parametros de URL que contam como filtro (a ordenacao e a pagina nao entram). */
const filterKeys = ['busca', 'categoria', 'marca', 'min', 'max'] as const
type FilterKey = (typeof filterKeys)[number]
type ParamUpdates = Partial<Record<FilterKey | 'sort', string | undefined>>

const BRANDS_COLLAPSED = 8
const PAGE_SIZE_FALLBACK = 12

const fieldClass =
  'h-11 w-full rounded-xl border border-transparent bg-surface px-3.5 text-sm text-ink outline-none transition ' +
  'placeholder:text-muted hover:border-line focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15'

function parsePrice(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function parsePage(value: string | null) {
  const parsed = Number(value ?? 1)
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1
}

/**
 * Categorias cadastradas em Configuracoes (na ordem do admin) que possuem produtos ativos,
 * o mesmo criterio do menu do cabecalho e da home. A categoria ativa sempre aparece.
 */
function buildCategoryOptions(configured: SiteCategory[], available: string[], active?: string) {
  const availableSet = new Set(available)
  const options = [
    ...new Set(
      configured
        .map((category) => category.name)
        .filter((name) => name.trim() && availableSet.has(name)),
    ),
  ]
  return withActive(options, active)
}

function withActive(options: string[], active?: string) {
  return active && !options.includes(active) ? [...options, active] : options
}

export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const { settings } = useSiteSettings()
  const { data: availableCategories = [] } = useAvailableProductCategories()
  const { data: availableBrands = [] } = useAvailableProductBrands()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  const page = parsePage(params.get('page'))
  const filters = {
    search: params.get('busca')?.trim() || undefined,
    categoria: params.get('categoria') || undefined,
    marca: params.get('marca') || undefined,
    min: parsePrice(params.get('min')),
    max: parsePrice(params.get('max')),
    sort: params.get('sort') || undefined,
    page,
  }

  const { data, isLoading, isError, isPlaceholderData, refetch } = useProducts(filters, { keepPrevious: true })
  const products = data?.products ?? []
  const count = data?.count ?? 0
  const totalPages = Math.ceil(count / (data?.pageSize ?? PAGE_SIZE_FALLBACK))

  const categoryOptions = buildCategoryOptions(settings.categories, availableCategories, filters.categoria)
  const brandOptions = withActive(availableBrands, filters.marca)

  const activeFilters: Array<{ key: FilterKey; label: string }> = []
  if (filters.search) activeFilters.push({ key: 'busca', label: `Busca: “${filters.search}”` })
  if (filters.categoria) activeFilters.push({ key: 'categoria', label: filters.categoria })
  if (filters.marca) activeFilters.push({ key: 'marca', label: filters.marca })
  if (filters.min) activeFilters.push({ key: 'min', label: `A partir de ${formatCurrency(filters.min)}` })
  if (filters.max) activeFilters.push({ key: 'max', label: `Até ${formatCurrency(filters.max)}` })
  const hasFilters = activeFilters.length > 0

  /** Monta a URL a partir dos parametros atuais; qualquer mudanca de filtro volta para a pagina 1. */
  const buildParams = (updates: ParamUpdates) => {
    const next = new URLSearchParams(params)
    for (const [key, raw] of Object.entries(updates)) {
      const value = raw?.trim() ?? ''
      if (value) next.set(key, value)
      else next.delete(key)
    }
    next.delete('page')
    return next
  }

  const hrefFor = (updates: ParamUpdates) => {
    const query = buildParams(updates).toString()
    return query ? `/catalogo?${query}` : '/catalogo'
  }

  const applyParams = (updates: ParamUpdates) => {
    const unchanged = Object.entries(updates).every(
      ([key, raw]) => (params.get(key) ?? '') === (raw?.trim() ?? ''),
    )
    if (unchanged) return
    setParams(buildParams(updates))
  }

  const clearFilters = () => {
    const next = new URLSearchParams(params)
    for (const key of filterKeys) next.delete(key)
    next.delete('page')
    setParams(next)
  }

  /** Leva o topo dos resultados para a tela quando ele esta acima dela ou escondido sob o cabecalho fixo. */
  const scrollToResults = () => {
    const element = resultsRef.current
    if (!element) return
    const headerOffset = Number.parseFloat(window.getComputedStyle(element).scrollMarginTop) || 0
    if (element.getBoundingClientRect().top >= headerOffset - 1) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }

  const goToPage = (nextPage: number) => {
    const next = new URLSearchParams(params)
    if (nextPage <= 1) next.delete('page')
    else next.set('page', String(nextPage))
    setParams(next)
    scrollToResults()
  }

  const heading = filters.search
    ? `Resultados para “${filters.search}”`
    : (filters.categoria ?? 'Todos os produtos')

  const title = filters.categoria
    ? `${filters.categoria} | ${SITE_NAME}`
    : `Catálogo | ${SITE_NAME} — Tênis e Perfumes`
  const description = filters.categoria
    ? `Confira ${filters.categoria} na ${SITE_NAME}: tênis e perfumes para comprar no varejo e no atacado.`
    : `Catálogo da ${SITE_NAME}: tênis e perfumes para comprar no varejo e no atacado. Encontre o seu modelo e a sua fragrância.`
  const path = filters.categoria
    ? `/catalogo?categoria=${encodeURIComponent(filters.categoria)}`
    : '/catalogo'

  const filterPanelProps: FilterPanelProps = {
    search: filters.search,
    categoria: filters.categoria,
    marca: filters.marca,
    min: filters.min,
    max: filters.max,
    categoryOptions,
    brandOptions,
    hrefFor,
    applyParams,
  }

  return (
    <>
      <Seo
        title={title}
        description={description}
        path={path}
        image={settings.logo_url}
        keywords={
          filters.categoria
            ? `${filters.categoria}, ${filters.categoria} no atacado, tênis, perfumes, varejo e atacado, ${SITE_NAME}`
            : undefined
        }
        jsonLd={[
          buildCollectionPageJsonLd({ name: title, description, path }),
          buildBreadcrumbJsonLd([
            { name: 'Início', path: '/' },
            { name: 'Catálogo', path: '/catalogo' },
            ...(filters.categoria ? [{ name: filters.categoria, path }] : []),
          ]),
        ]}
      />

      <div className="border-b border-line bg-white">
        <div className="container py-7 md:py-10">
          <nav aria-label="Trilha de navegação" className="text-sm text-muted">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link to="/" className="-my-2 inline-block py-2 transition hover:text-brand">
                  Início
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight size={14} />
              </li>
              <li>
                {filters.categoria ? (
                  <Link to="/catalogo" className="-my-2 inline-block py-2 transition hover:text-brand">
                    Catálogo
                  </Link>
                ) : (
                  <span aria-current="page" className="text-ink-soft">
                    Catálogo
                  </span>
                )}
              </li>
              {filters.categoria && (
                <>
                  <li aria-hidden="true">
                    <ChevronRight size={14} />
                  </li>
                  <li className="min-w-0">
                    <span aria-current="page" className="block truncate text-ink-soft">
                      {filters.categoria}
                    </span>
                  </li>
                </>
              )}
            </ol>
          </nav>
          <h1 className="mt-3 break-words text-3xl font-bold tracking-tight text-ink sm:text-4xl">{heading}</h1>
          <div className="mt-2 min-h-6 text-[15px] text-muted" aria-live="polite">
            {isLoading ? (
              <span className="inline-block h-4 w-28 animate-pulse rounded-full bg-surface align-middle" />
            ) : (
              data && (
                <span className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}>
                  {count === 1 ? '1 produto encontrado' : `${count} produtos encontrados`}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      <section className="container py-8 md:py-10 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10 xl:gap-12">
        <aside className="hidden lg:block" aria-label="Filtros do catálogo">
          {/* O cabecalho fixo tem ~130px no desktop (linha da logo + barra de categorias). */}
          <div className="sticky top-36 -mx-1 max-h-[calc(100vh-10rem)] overflow-y-auto px-1 pb-6 pt-1 [scrollbar-width:thin]">
            <div className="flex min-h-10 items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-ink">Filtros</h2>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="min-h-10 rounded-lg px-2 text-sm font-semibold text-brand transition hover:text-brand-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
                >
                  Limpar filtros
                </button>
              )}
            </div>
            <FilterPanel {...filterPanelProps} layout="sidebar" onApplied={scrollToResults} />
          </div>
        </aside>

        <div ref={resultsRef} className="min-w-0 scroll-mt-40">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              className="lg:hidden"
              aria-expanded={filtersOpen}
              aria-controls="catalogo-filtros"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <SlidersHorizontal size={18} />
              Filtros
              {hasFilters && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-xs font-semibold text-white">
                  {activeFilters.length}
                </span>
              )}
              <ChevronDown
                size={16}
                className={cn('hidden text-muted transition sm:block', filtersOpen && 'rotate-180')}
                aria-hidden="true"
              />
            </Button>

            {hasFilters && (
              <ul className="order-last flex w-full min-w-0 flex-wrap items-center gap-2 lg:order-none lg:w-auto lg:flex-1">
                {activeFilters.map((filter) => (
                  <li key={filter.key} className="max-w-full">
                    <button
                      type="button"
                      onClick={() => applyParams({ [filter.key]: undefined })}
                      aria-label={`Remover filtro ${filter.label}`}
                      className="inline-flex h-10 max-w-full items-center gap-1.5 rounded-full bg-brand-mint pl-3.5 pr-2.5 text-sm font-medium text-brand-hover transition hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 sm:h-9"
                    >
                      <span className="truncate">{filter.label}</span>
                      <X size={15} className="shrink-0" />
                    </button>
                  </li>
                ))}
                {activeFilters.length > 1 && (
                  <li>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex h-10 items-center rounded-full px-3 text-sm font-semibold text-muted transition hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 sm:h-9"
                    >
                      Limpar tudo
                    </button>
                  </li>
                )}
              </ul>
            )}

            <label className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2.5 sm:flex-none">
              <span className="hidden whitespace-nowrap text-sm text-muted sm:inline">Ordenar por</span>
              <span className="block w-full max-w-52 sm:w-48">
                <Select
                  aria-label="Ordenar produtos"
                  value={filters.sort ?? ''}
                  onChange={(event) => applyParams({ sort: event.target.value })}
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </span>
            </label>
          </div>

          {filtersOpen && (
            <div
              id="catalogo-filtros"
              className="mt-4 rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5 lg:hidden"
            >
              <FilterPanel {...filterPanelProps} layout="panel" />
              <div className="mt-2 flex flex-wrap gap-3 border-t border-line pt-4">
                {hasFilters && (
                  <Button type="button" variant="ghost" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                )}
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() => {
                    setFiltersOpen(false)
                    scrollToResults()
                  }}
                >
                  {data && !isPlaceholderData
                    ? count === 1
                      ? 'Ver 1 produto'
                      : `Ver ${count} produtos`
                    : 'Ver produtos'}
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6">
            {isLoading || (isPlaceholderData && products.length === 0) ? (
              <CatalogProductGrid className="md:grid-cols-3">
                <CatalogProductSkeletons count={9} />
              </CatalogProductGrid>
            ) : isError && !data ? (
              <CatalogEmptyState
                icon={CircleAlert}
                title="Não foi possível carregar os produtos"
                description="Verifique sua conexão e tente novamente em instantes."
              >
                <Button type="button" onClick={() => void refetch()}>
                  Tentar novamente
                </Button>
              </CatalogEmptyState>
            ) : products.length === 0 ? (
              <CatalogEmptyState
                icon={SearchX}
                title="Nenhum produto encontrado"
                description={
                  hasFilters
                    ? 'Tente ajustar ou limpar os filtros para ver mais produtos.'
                    : 'Ainda não há produtos disponíveis por aqui. Volte em breve.'
                }
              >
                {hasFilters && (
                  <Button type="button" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                )}
                {page > 1 && (
                  <Button type="button" variant="secondary" onClick={() => goToPage(1)}>
                    Ir para a primeira página
                  </Button>
                )}
              </CatalogEmptyState>
            ) : (
              <CatalogProductGrid className="md:grid-cols-3" busy={isPlaceholderData}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </CatalogProductGrid>
            )}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
        </div>
      </section>
    </>
  )
}

type FilterPanelProps = {
  search?: string
  categoria?: string
  marca?: string
  min?: number
  max?: number
  categoryOptions: string[]
  brandOptions: string[]
  hrefFor: (updates: ParamUpdates) => string
  applyParams: (updates: ParamUpdates) => void
}

/**
 * Filtros do catalogo: barra lateral no desktop e painel recolhivel no celular.
 * `onApplied` roda apos uma acao explicita (link de opcao, Enter, "Aplicar preco"); na barra lateral
 * fixa ele traz o topo dos resultados de volta para a tela.
 */
function FilterPanel({
  layout,
  search,
  categoria,
  marca,
  min,
  max,
  categoryOptions,
  brandOptions,
  hrefFor,
  applyParams,
  onApplied,
}: FilterPanelProps & { layout: 'sidebar' | 'panel'; onApplied?: () => void }) {
  const idPrefix = `catalogo-${layout}`

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    applyParams({ busca: String(form.get('busca') ?? '') })
    onApplied?.()
  }

  const submitPrice = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    applyParams({ min: String(form.get('min') ?? ''), max: String(form.get('max') ?? '') })
    onApplied?.()
  }

  return (
    <div className="divide-y divide-line">
      <FilterSection title="Buscar" layout={layout}>
        <form role="search" onSubmit={submitSearch}>
          <label htmlFor={`${idPrefix}-busca`} className="sr-only">
            Buscar no catálogo
          </label>
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              key={search ?? ''}
              id={`${idPrefix}-busca`}
              name="busca"
              type="search"
              enterKeyHint="search"
              placeholder="Buscar produtos"
              defaultValue={search ?? ''}
              onBlur={(event) => applyParams({ busca: event.target.value })}
              className={cn(fieldClass, 'pl-10')}
            />
          </div>
        </form>
      </FilterSection>

      {categoryOptions.length > 0 && (
        <FilterSection title="Categorias" layout={layout}>
          <OptionList
            layout={layout}
            allLabel="Todas as categorias"
            options={categoryOptions}
            active={categoria}
            hrefFor={(value) => hrefFor({ categoria: value })}
            onSelect={onApplied}
          />
        </FilterSection>
      )}

      {brandOptions.length > 0 && (
        <FilterSection title="Marcas" layout={layout}>
          <OptionList
            layout={layout}
            allLabel="Todas as marcas"
            options={brandOptions}
            active={marca}
            collapseAfter={BRANDS_COLLAPSED}
            expandLabel="Ver todas as marcas"
            hrefFor={(value) => hrefFor({ marca: value })}
            onSelect={onApplied}
          />
        </FilterSection>
      )}

      <FilterSection title="Faixa de preço" layout={layout}>
        <form onSubmit={submitPrice} className="grid gap-3">
          <div className="grid grid-cols-2 gap-2.5">
            <PriceField
              key={`min-${min ?? ''}`}
              id={`${idPrefix}-min`}
              name="min"
              label="Mínimo"
              value={min}
              onCommit={(value) => applyParams({ min: value })}
            />
            <PriceField
              key={`max-${max ?? ''}`}
              id={`${idPrefix}-max`}
              name="max"
              label="Máximo"
              value={max}
              onCommit={(value) => applyParams({ max: value })}
            />
          </div>
          <Button type="submit" variant="secondary" className="w-full">
            Aplicar preço
          </Button>
        </form>
      </FilterSection>
    </div>
  )
}

function FilterSection({
  title,
  layout,
  children,
}: {
  title: string
  layout: 'sidebar' | 'panel'
  children: ReactNode
}) {
  return (
    <section className={cn('py-5', layout === 'panel' && 'first:pt-0')}>
      <h3 className="mb-3 text-sm font-semibold text-ink">{title}</h3>
      {children}
    </section>
  )
}

function OptionList({
  layout,
  allLabel,
  options,
  active,
  hrefFor,
  collapseAfter,
  expandLabel,
  onSelect,
}: {
  layout: 'sidebar' | 'panel'
  allLabel: string
  options: string[]
  active?: string
  hrefFor: (value?: string) => string
  collapseAfter?: number
  expandLabel?: string
  onSelect?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const collapsible = Boolean(collapseAfter && options.length > collapseAfter)
  const activeIndex = active ? options.indexOf(active) : -1
  const visible =
    collapsible && !expanded
      ? options.filter((_, index) => index < (collapseAfter ?? 0) || index === activeIndex)
      : options

  const items: Array<{ value?: string; label: string }> = [
    { value: undefined, label: allLabel },
    ...visible.map((option) => ({ value: option, label: option })),
  ]

  return (
    <div>
      <ul className={cn(layout === 'sidebar' ? 'grid gap-0.5' : 'flex flex-wrap gap-2')}>
        {items.map((item) => {
          const isActive = (item.value ?? '') === (active ?? '')
          return (
            <li key={item.value ?? '__all'} className={cn(layout === 'panel' && 'max-w-full')}>
              <Link
                to={hrefFor(item.value)}
                onClick={(event) => {
                  // Ctrl/Cmd/Shift + clique abre em outra aba: a pagina atual nao deve rolar.
                  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                  onSelect?.()
                }}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20',
                  layout === 'sidebar'
                    ? 'flex min-h-10 items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm'
                    : 'inline-flex h-10 max-w-full items-center rounded-full border px-4 text-sm',
                  layout === 'sidebar' &&
                    (isActive
                      ? 'bg-brand-mint font-semibold text-brand'
                      : 'text-ink-soft hover:bg-surface hover:text-ink'),
                  layout === 'panel' &&
                    (isActive
                      ? 'border-brand bg-brand-mint font-semibold text-brand'
                      : 'border-line bg-white text-ink-soft hover:border-[#D0D5DD] hover:bg-surface'),
                )}
              >
                <span className="min-w-0 truncate">{item.label}</span>
                {layout === 'sidebar' && isActive && <Check size={16} className="shrink-0" aria-hidden="true" />}
              </Link>
            </li>
          )
        })}
      </ul>
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-brand transition hover:text-brand-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
        >
          {expanded ? 'Ver menos' : `${expandLabel ?? 'Ver todas'} (${options.length})`}
          <ChevronDown size={16} className={cn('transition', expanded && 'rotate-180')} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

function PriceField({
  id,
  name,
  label,
  value,
  onCommit,
}: {
  id: string
  name: 'min' | 'max'
  label: string
  value?: number
  onCommit: (value: string) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted" aria-hidden="true">
          R$
        </span>
        <input
          id={id}
          name={name}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          placeholder="0"
          defaultValue={value ?? ''}
          onBlur={(event) => onCommit(event.target.value)}
          className={cn(
            fieldClass,
            'pl-10 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          )}
        />
      </div>
    </div>
  )
}
