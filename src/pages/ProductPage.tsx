import { ShoppingBag, Zap } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { ProductGallery } from '../components/ProductGallery'
import { ProductReviews } from '../components/ProductReviews'
import { FavoriteButton } from '../components/FavoriteButton'
import { Seo } from '../components/Seo'
import { Badge, Button, EmptyState, Rating, Skeleton, useToast } from '../components/ui'
import { useCart } from '../contexts/CartContext'
import { useProduct, useRelatedProducts } from '../hooks/useProducts'
import { isStoreDemoMode, STORE_DEMO_SHORT_MESSAGE } from '../lib/storeMode'
import {
  buildBreadcrumbJsonLd,
  buildProductDescription,
  buildProductJsonLd,
} from '../lib/seo'
import { availableFlavors, productRequiresFlavor } from '../services/flavors'
import type { ProductFlavor } from '../types'
import { formatCurrency } from '../utils/format'

export function ProductPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { notify } = useToast()
  const { data: product, isLoading, isError } = useProduct(slug)
  const { data: related = [] } = useRelatedProducts(product)
  const [selectedFlavor, setSelectedFlavor] = useState<ProductFlavor | null>(null)

  if (isLoading) return <section className="container py-10"><Skeleton className="h-[640px]" /></section>
  if (isError || !product) {
    return <section className="container py-10"><EmptyState title="Produto nao encontrado" description="Confira o catalogo para ver produtos disponiveis." /></section>
  }

  const flavors = availableFlavors(product.produto_sabores)
  const requiresFlavor = productRequiresFlavor(product.produto_sabores)
  const activeFlavor = selectedFlavor && flavors.some((flavor) => flavor.id === selectedFlavor.id) ? selectedFlavor : null
  const stock = requiresFlavor ? (activeFlavor?.estoque ?? 0) : product.estoque
  const price = product.preco_promocional ?? product.preco
  const canBuy = !isStoreDemoMode && (!requiresFlavor || Boolean(activeFlavor)) && stock > 0
  const primaryImage = [...(product.imagens_produtos ?? [])].sort((a, b) => a.ordem - b.ordem)[0]?.url
  const seoDescription = buildProductDescription(product)

  const handleAdd = (goToCart = false) => {
    if (isStoreDemoMode) {
      notify(STORE_DEMO_SHORT_MESSAGE, 'error')
      return
    }
    if (requiresFlavor && !activeFlavor) {
      notify('Selecione um sabor para continuar', 'error')
      return
    }
    const result = addItem(product, 1, activeFlavor)
    notify(
      result.message ?? (result.success ? 'Produto adicionado ao carrinho' : 'Nao foi possivel adicionar'),
      result.success ? 'success' : 'error',
    )
    if (result.success && goToCart) navigate('/carrinho')
  }

  return (
    <>
      <Seo
        title={`${product.nome} em Betim | Passarim Suplementos`}
        description={seoDescription}
        path={`/produto/${product.slug}`}
        image={primaryImage}
        type="product"
        keywords={`${product.nome}, ${product.marca}, ${product.categoria}, suplementos Betim, Passarim Suplementos`}
        jsonLd={[
          buildProductJsonLd(product),
          buildBreadcrumbJsonLd([
            { name: 'Início', path: '/' },
            { name: 'Catálogo', path: '/catalogo' },
            { name: product.categoria, path: `/catalogo?categoria=${encodeURIComponent(product.categoria)}` },
            { name: product.nome, path: `/produto/${product.slug}` },
          ]),
        ]}
      />
      <section className="container grid gap-10 py-10 lg:grid-cols-[1fr_0.9fr]">
        <ProductGallery images={product.imagens_produtos} name={product.nome} />
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{product.categoria}</Badge>
            {product.destaque && <Badge tone="success">Mais vendido</Badge>}
            {product.preco_promocional && <Badge tone="promo">Promocao</Badge>}
            {requiresFlavor && <Badge>Varios sabores</Badge>}
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-black md:text-5xl">{product.nome}</h1>
          <p className="mt-3 text-sm font-bold uppercase tracking-wide text-gray-400">{product.marca}</p>
          <div className="mt-5 flex items-center gap-3">
            <Rating value={product.avaliacao_media} />
            <span className="text-sm text-gray-500">({product.total_avaliacoes} avaliacoes)</span>
            <FavoriteButton productId={product.id} />
          </div>
          {product.descricao?.trim() && (
            <div className="mt-6 rounded-2xl bg-gray-50 p-5">
              <h2 className="text-sm font-black uppercase tracking-wide text-black">Descrição do produto</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-600">{product.descricao}</p>
            </div>
          )}
          <div className="mt-8">
            {product.preco_promocional && <p className="text-lg text-gray-400 line-through">{formatCurrency(product.preco)}</p>}
            <p className="text-4xl font-black text-black">{formatCurrency(price)}</p>
            <p className="mt-2 text-sm text-green-700">
              {requiresFlavor && !activeFlavor
                ? 'Selecione um sabor para ver o estoque'
                : `Estoque disponivel: ${stock} unidades`}
            </p>
          </div>

          {requiresFlavor && (
            <div className="mt-8">
              <h2 className="text-sm font-black uppercase tracking-wide text-black">Escolha o sabor</h2>
              {flavors.length === 0 ? (
                <p className="mt-3 text-sm text-amber-700">Todos os sabores estao esgotados no momento.</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {flavors.map((flavor) => {
                    const selected = activeFlavor?.id === flavor.id
                    return (
                      <button
                        key={flavor.id}
                        type="button"
                        onClick={() => setSelectedFlavor(flavor)}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          selected
                            ? 'border-black bg-black text-white'
                            : 'border-gray-200 bg-white text-black hover:border-black'
                        }`}
                      >
                        {flavor.nome}
                        <span className={`ml-2 text-xs ${selected ? 'text-white/70' : 'text-gray-400'}`}>
                          ({flavor.estoque})
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Button disabled={!canBuy} onClick={() => handleAdd(false)}>
              <ShoppingBag size={18} /> Adicionar ao carrinho
            </Button>
            <Button variant="secondary" disabled={!canBuy} onClick={() => handleAdd(true)}>
              <Zap size={18} /> Comprar agora
            </Button>
          </div>
          {isStoreDemoMode && (
            <p className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-50 px-4 py-3 text-sm font-medium text-ink">
              {STORE_DEMO_SHORT_MESSAGE}
            </p>
          )}
          <ProductReviews productId={product.id} />
        </div>
      </section>
      <section className="container py-10">
        <h2 className="text-3xl font-black text-black">Produtos relacionados</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((item) => <ProductCard key={item.id} product={item} />)}
        </div>
      </section>
    </>
  )
}
