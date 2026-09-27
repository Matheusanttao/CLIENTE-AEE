import { Seo } from '../components/Seo'
import { ProductCard } from '../components/ProductCard'
import { EmptyState, Input, Pagination, Select, Skeleton } from '../components/ui'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { useAvailableProductCategories, useProducts } from '../hooks/useProducts'
import { brands } from '../lib/constants'
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from '../lib/seo'
import { useSearchParams } from 'react-router-dom'

export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const { settings } = useSiteSettings()
  const { data: availableCategories = [] } = useAvailableProductCategories()
  const availableCategorySet = new Set(availableCategories)
  const visibleCategories = settings.categories.filter((category) => availableCategorySet.has(category.name))
  const page = Number(params.get('page') ?? 1)
  const filters = {
    search: params.get('busca') ?? undefined,
    categoria: params.get('categoria') ?? undefined,
    marca: params.get('marca') ?? undefined,
    min: params.get('min') ? Number(params.get('min')) : undefined,
    max: params.get('max') ? Number(params.get('max')) : undefined,
    sort: params.get('sort') ?? undefined,
    page,
  }
  const { data, isLoading } = useProducts(filters)
  const products = data?.products ?? []
  const totalPages = Math.ceil((data?.count ?? 0) / (data?.pageSize ?? 12))

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    setParams(next)
  }

  const title = filters.categoria
    ? `${filters.categoria} em Betim | Passarim Suplementos`
    : 'Catálogo de Suplementos em Betim | Passarim Suplementos'
  const description = filters.categoria
    ? `Compre ${filters.categoria} na Passarim Suplementos em Betim. Qualidade, frete rápido e compra segura.`
    : 'Catálogo de whey protein, creatina, vitaminas e suplementos fitness em Betim. Passarim Suplementos com entrega rápida.'
  const path = filters.categoria
    ? `/catalogo?categoria=${encodeURIComponent(filters.categoria)}`
    : '/catalogo'

  return (
    <>
      <Seo
        title={title}
        description={description}
        path={path}
        image={settings.logo_url}
        keywords={
          filters.categoria
            ? `${filters.categoria} Betim, suplementos Betim, ${filters.categoria}, Passarim Suplementos`
            : undefined
        }
        jsonLd={[
          buildCollectionPageJsonLd({ name: title, description, path }),
          buildBreadcrumbJsonLd([
            { name: 'Início', path: '/' },
            { name: filters.categoria ? filters.categoria : 'Catálogo', path },
          ]),
        ]}
      />
      <section className="container py-10">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink to-ink-soft p-9 text-white shadow-soft">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand/20 blur-[100px]" />
          <p className="relative text-xs font-medium uppercase tracking-[0.2em] text-brand">
            Suplementos em Betim
          </p>
          <h1 className="relative mt-3 font-display text-4xl font-bold">Encontre seu suplemento ideal</h1>
        </div>

        <div className="mt-8 grid gap-4 rounded-3xl border border-line bg-white p-5 shadow-card lg:grid-cols-6">
          <Input
            className="lg:col-span-2"
            placeholder="Buscar produto"
            defaultValue={filters.search}
            onBlur={(event) => updateParam('busca', event.target.value)}
          />
          <Select defaultValue={filters.categoria ?? ''} onChange={(event) => updateParam('categoria', event.target.value)}>
            <option value="">Todas categorias</option>
            {visibleCategories.map((category) => (
              <option key={category.name} value={category.name}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select defaultValue={filters.marca ?? ''} onChange={(event) => updateParam('marca', event.target.value)}>
            <option value="">Todas marcas</option>
            {brands.map((brand) => (
              <option key={brand}>{brand}</option>
            ))}
          </Select>
          <Select defaultValue={filters.sort ?? ''} onChange={(event) => updateParam('sort', event.target.value)}>
            <option value="">Mais recentes</option>
            <option value="price-asc">Menor preco</option>
            <option value="price-desc">Maior preco</option>
            <option value="rating">Melhor avaliacao</option>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Min" type="number" defaultValue={filters.min ?? ''} onBlur={(event) => updateParam('min', event.target.value)} />
            <Input placeholder="Max" type="number" defaultValue={filters.max ?? ''} onBlur={(event) => updateParam('max', event.target.value)} />
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-96" />)
            : products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
        {!isLoading && products.length === 0 && (
          <div className="mt-8">
            <EmptyState title="Nenhum produto encontrado" description="Ajuste os filtros para encontrar outros suplementos." />
          </div>
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={(nextPage) => {
            const next = new URLSearchParams(params)
            next.set('page', String(nextPage))
            setParams(next)
          }}
        />
      </section>
    </>
  )
}
