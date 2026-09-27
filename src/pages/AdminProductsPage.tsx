import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ImagePlus, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AdminCard, AdminListRow, AdminSectionHeader } from '../components/admin/AdminUI'
import { MaskedInput } from '../components/MaskedInput'
import { Button, Input, Modal, Select, Skeleton, useConfirm, useToast } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { CORREIOS_MAX_WEIGHT_KG } from '../lib/constants'
import { optimizeCloudinaryUrl } from '../lib/cloudinary'
import { supabase } from '../lib/supabase'
import { deleteProduct, reactivateProduct, updateProduct } from '../services/admin'
import { uploadToCloudinary } from '../services/cloudinary'
import { getFlavorsByProduct, replaceProductFlavors } from '../services/flavors'
import type { Product, ProductCategory, ProductImage } from '../types'
import { slugify } from '../utils/slug'

type FlavorDraft = { nome: string; estoque: number }

type ProductCreateDraft = {
  nome: string
  marca: string
  categoria: string
  estoque: number | null
  preco: number | null
  preco_promocional: number | null
  peso_kg: number | null
  altura_cm: number | null
  largura_cm: number | null
  comprimento_cm: number | null
  descricao: string
  destaque: boolean
  flavors: FlavorDraft[]
}

const CREATE_DRAFT_KEY = 'passarin.admin.product-draft'
let createImageDraftCache: File[] = []

function loadCreateDraft(): ProductCreateDraft | null {
  try {
    const raw = localStorage.getItem(CREATE_DRAFT_KEY)
    return raw ? (JSON.parse(raw) as ProductCreateDraft) : null
  } catch {
    return null
  }
}

function persistCreateDraft(form: HTMLFormElement, flavors: FlavorDraft[]) {
  const data = new FormData(form)
  const draft: ProductCreateDraft = {
    nome: String(data.get('nome') ?? ''),
    marca: String(data.get('marca') ?? ''),
    categoria: String(data.get('categoria') ?? ''),
    estoque: parseOptionalNumber(data.get('estoque')),
    preco: parseOptionalNumber(data.get('preco')),
    preco_promocional: parseOptionalNumber(data.get('preco_promocional')),
    peso_kg: parseOptionalNumber(data.get('peso_kg')),
    altura_cm: parseOptionalNumber(data.get('altura_cm')),
    largura_cm: parseOptionalNumber(data.get('largura_cm')),
    comprimento_cm: parseOptionalNumber(data.get('comprimento_cm')),
    descricao: String(data.get('descricao') ?? ''),
    destaque: data.get('destaque') === 'on',
    flavors,
  }
  localStorage.setItem(CREATE_DRAFT_KEY, JSON.stringify(draft))
}

const parseOptionalNumber = (value: FormDataEntryValue | null) => {
  const text = String(value ?? '').trim()
  if (!text) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

const parseRequiredNumber = (value: FormDataEntryValue | null, label: string) => {
  const parsed = parseOptionalNumber(value)
  if (parsed == null || parsed < 0) throw new Error(`Informe um valor valido para ${label}`)
  return parsed
}

function productSaveErrorMessage(error: unknown, fallback: string) {
  const details =
    typeof error === 'object' && error !== null
      ? (error as { code?: string; message?: string })
      : null
  const message = details?.message ?? (error instanceof Error ? error.message : '')

  if (details?.code === '23505' || message.includes('produtos_slug_key')) {
    return 'Já existe um produto com esse nome. Para diferenciar, inclua no nome o peso, tamanho ou sabor. Exemplo: Creatina 300g.'
  }

  return message || fallback
}

export function AdminProductsPage() {
  const { notify } = useToast()
  const { confirm } = useConfirm()
  const { session } = useAuth()
  const { settings } = useSiteSettings()
  const categories = settings.categories.map((category) => category.name)
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const isCreateMode = location.pathname.endsWith('/novo')
  const createFormRef = useRef<HTMLFormElement>(null)
  const [createDraft, setCreateDraft] = useState<ProductCreateDraft | null>(() => loadCreateDraft())
  const [uploading, setUploading] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)
  const [createFlavors, setCreateFlavors] = useState<FlavorDraft[]>(() => createDraft?.flavors ?? [])
  const [editFlavors, setEditFlavors] = useState<FlavorDraft[]>([])
  const [createImageFiles, setCreateImageFiles] = useState<File[]>(() => createImageDraftCache)
  const [editExistingImages, setEditExistingImages] = useState<ProductImage[]>([])
  const [editImageFiles, setEditImageFiles] = useState<File[]>([])
  const [editCoverSource, setEditCoverSource] = useState<'existing' | 'new'>('existing')
  const [createFormKey, setCreateFormKey] = useState(0)
  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null)

  useEffect(() => {
    if (!isCreateMode || !createFormRef.current) return
    persistCreateDraft(createFormRef.current, createFlavors)
  }, [createFlavors, isCreateMode])

  const saveCreateDraft = (form: HTMLFormElement) => {
    window.setTimeout(() => persistCreateDraft(form, createFlavors), 0)
  }

  const handleCreateImagesChange = (files: File[]) => {
    createImageDraftCache = files
    setCreateImageFiles(files)
  }

  const discardCreateDraft = () => {
    localStorage.removeItem(CREATE_DRAFT_KEY)
    createImageDraftCache = []
    setCreateDraft(null)
    setCreateFlavors([])
    setCreateImageFiles([])
  }

  const {
    data: products = [],
    error: productsError,
    isError: productsFailed,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['admin-products', session?.user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select('*, imagens_produtos(*), produto_sabores(*)')
        .order('criado_em', { ascending: false })
      if (error) throw error
      return (data ?? []) as Product[]
    },
    enabled: Boolean(session?.access_token),
    retry: 3,
    refetchOnMount: 'always',
  })
  const normalizedProductSearch = productSearch.trim().toLocaleLowerCase('pt-BR')
  const filteredProducts = normalizedProductSearch
    ? products.filter((product) =>
        [product.nome, product.marca, product.categoria].some((value) =>
          String(value ?? '').toLocaleLowerCase('pt-BR').includes(normalizedProductSearch),
        ),
      )
    : products

  const openEdit = async (product: Product) => {
    const existingImages = [...(product.imagens_produtos ?? [])].sort((a, b) => a.ordem - b.ordem)
    setEditing(product)
    setEditImageFiles([])
    setEditExistingImages(existingImages)
    setEditCoverSource(existingImages.length > 0 ? 'existing' : 'new')
    setEditFlavors(
      (product.produto_sabores ?? []).map((flavor) => ({
        nome: flavor.nome,
        estoque: flavor.estoque,
      })),
    )
    try {
      const flavors = await getFlavorsByProduct(product.id)
      setEditFlavors(flavors.map((flavor) => ({ nome: flavor.nome, estoque: flavor.estoque })))
    } catch {
      // mantem sabores ja carregados no produto
    }
  }

  const createProduct = async (formData: FormData) => {
    try {
      flushSync(() => {
        setUploading(true)
        setSaveStatus('Salvando dados do produto...')
      })
      const nome = String(formData.get('nome') ?? '')
      const flavors = createFlavors.filter((flavor) => flavor.nome.trim())
      const estoque = flavors.length
        ? flavors.reduce((sum, flavor) => sum + Math.max(0, Number(flavor.estoque) || 0), 0)
        : parseRequiredNumber(formData.get('estoque'), 'estoque')

      const preco = parseRequiredNumber(formData.get('preco'), 'preco')
      if (preco <= 0) throw new Error('Informe um preco valido')

      const pesoKg = parseRequiredNumber(formData.get('peso_kg'), 'peso')
      const alturaCm = parseRequiredNumber(formData.get('altura_cm'), 'altura')
      const larguraCm = parseRequiredNumber(formData.get('largura_cm'), 'largura')
      const comprimentoCm = parseRequiredNumber(formData.get('comprimento_cm'), 'comprimento')
      if (pesoKg <= 0 || alturaCm <= 0 || larguraCm <= 0 || comprimentoCm <= 0) {
        throw new Error('Peso e medidas precisam ser maiores que zero')
      }
      if (pesoKg > CORREIOS_MAX_WEIGHT_KG) {
        throw new Error(`Peso maximo permitido pelos Correios: ${CORREIOS_MAX_WEIGHT_KG} kg`)
      }

      const productPayload = {
        nome,
        slug: slugify(nome),
        descricao: String(formData.get('descricao') ?? ''),
        categoria: String(formData.get('categoria')) as ProductCategory,
        marca: String(formData.get('marca') ?? ''),
        preco,
        preco_promocional: parseOptionalNumber(formData.get('preco_promocional')),
        estoque,
        peso_kg: pesoKg,
        altura_cm: alturaCm,
        largura_cm: larguraCm,
        comprimento_cm: comprimentoCm,
        destaque: formData.get('destaque') === 'on',
      }

      let product: Product
      {
        const firstTry = await supabase
          .from('produtos')
          .insert({ ...productPayload, ativo: true })
          .select()
          .single()

        if (!firstTry.error && firstTry.data) {
          product = firstTry.data as Product
        } else if (
          firstTry.error &&
          (String(firstTry.error.message).includes('ativo') || firstTry.error.code === 'PGRST204')
        ) {
          const retry = await supabase.from('produtos').insert(productPayload).select().single()
          if (retry.error) throw retry.error
          product = retry.data as Product
        } else {
          throw firstTry.error ?? new Error('Erro ao cadastrar produto')
        }
      }

      if (flavors.length > 0) {
        setSaveStatus('Salvando sabores...')
        await replaceProductFlavors(product.id, flavors)
      }

      if (createImageFiles.length > 0) {
        const rows = []
        for (let index = 0; index < createImageFiles.length; index += 1) {
          setSaveStatus(`Enviando foto ${index + 1} de ${createImageFiles.length}...`)
          const url = await uploadToCloudinary(createImageFiles[index])
          rows.push({
            produto_id: product.id,
            url,
            alt: nome,
            ordem: index,
          })
        }
        setSaveStatus('Finalizando cadastro...')
        const { error: imageError } = await supabase.from('imagens_produtos').insert(rows)
        if (imageError) throw imageError
      }
      setSaveStatus('Atualizando lista...')
      await refetch()
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] })

      discardCreateDraft()
      setCreateFormKey((current) => current + 1)
      setUploading(false)
      setSaveStatus('')
      notify('Produto cadastrado')
      setSuccessModal({
        title: 'Produto cadastrado',
        message: `"${nome}" foi inserido no catalogo com sucesso.`,
      })
      navigate('/admin/produtos')
    } catch (error) {
      notify(productSaveErrorMessage(error, 'Não foi possível salvar o produto.'), 'error')
      setUploading(false)
      setSaveStatus('')
    }
  }

  const handleDelete = async (product: Product) => {
    const ok = await confirm({
      title: 'Remover produto',
      message: `Se "${product.nome}" nunca foi vendido, sera excluido. Se ja entrou em algum pedido, sera apenas ocultado da loja (o historico permanece).`,
      confirmLabel: 'Remover',
      tone: 'danger',
    })
    if (!ok) return
    try {
      const result = await deleteProduct(product.id)
      notify(
        result.mode === 'deleted'
          ? 'Produto excluido'
          : 'Produto ocultado da loja (ja havia vendas vinculadas)',
      )
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao remover produto', 'error')
    }
  }

  const handleReactivate = async (product: Product) => {
    try {
      await reactivateProduct(product.id)
      notify('Produto reativado na loja')
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao reativar produto', 'error')
    }
  }

  const handleEdit = async (formData: FormData) => {
    if (!editing) return
    try {
      flushSync(() => {
        setSavingEdit(true)
        setSaveStatus('Salvando dados do produto...')
      })
      const flavors = editFlavors.filter((flavor) => flavor.nome.trim())
      const estoque = flavors.length
        ? flavors.reduce((sum, flavor) => sum + Math.max(0, Number(flavor.estoque) || 0), 0)
        : parseRequiredNumber(formData.get('estoque'), 'estoque')

      const preco = parseRequiredNumber(formData.get('preco'), 'preco')
      if (preco <= 0) throw new Error('Informe um preco valido')

      const pesoKg = parseRequiredNumber(formData.get('peso_kg'), 'peso')
      const alturaCm = parseRequiredNumber(formData.get('altura_cm'), 'altura')
      const larguraCm = parseRequiredNumber(formData.get('largura_cm'), 'largura')
      const comprimentoCm = parseRequiredNumber(formData.get('comprimento_cm'), 'comprimento')
      if (pesoKg <= 0 || alturaCm <= 0 || larguraCm <= 0 || comprimentoCm <= 0) {
        throw new Error('Peso e medidas precisam ser maiores que zero')
      }
      if (pesoKg > CORREIOS_MAX_WEIGHT_KG) {
        throw new Error(`Peso maximo permitido pelos Correios: ${CORREIOS_MAX_WEIGHT_KG} kg`)
      }

      await updateProduct(editing.id, {
        nome: String(formData.get('nome') ?? ''),
        descricao: String(formData.get('descricao') ?? ''),
        categoria: String(formData.get('categoria')) as ProductCategory,
        marca: String(formData.get('marca') ?? ''),
        preco,
        preco_promocional: parseOptionalNumber(formData.get('preco_promocional')),
        estoque,
        peso_kg: pesoKg,
        altura_cm: alturaCm,
        largura_cm: larguraCm,
        comprimento_cm: comprimentoCm,
        destaque: formData.get('destaque') === 'on',
      })
      setSaveStatus('Salvando sabores...')
      await replaceProductFlavors(editing.id, flavors)

      const originalIds = new Set((editing.imagens_produtos ?? []).map((image) => image.id))
      const keptIds = new Set(editExistingImages.map((image) => image.id))
      const removedIds = [...originalIds].filter((id) => !keptIds.has(id))
      if (removedIds.length > 0) {
        setSaveStatus('Atualizando fotos...')
        const { error: deleteImagesError } = await supabase
          .from('imagens_produtos')
          .delete()
          .in('id', removedIds)
        if (deleteImagesError) throw deleteImagesError
      }

      const existingOrderOffset = editCoverSource === 'new' && editImageFiles.length > 0 ? 1 : 0
      for (const [index, image] of editExistingImages.entries()) {
        const nextOrder = index + existingOrderOffset
        if (image.ordem !== nextOrder) {
          const { error: orderError } = await supabase
            .from('imagens_produtos')
            .update({ ordem: nextOrder })
            .eq('id', image.id)
          if (orderError) throw orderError
        }
      }

      if (editImageFiles.length > 0) {
        const rows = []
        for (let index = 0; index < editImageFiles.length; index += 1) {
          setSaveStatus(`Enviando foto ${index + 1} de ${editImageFiles.length}...`)
          const url = await uploadToCloudinary(editImageFiles[index])
          const order =
            editCoverSource === 'new'
              ? index === 0
                ? 0
                : editExistingImages.length + index
              : editExistingImages.length + index
          rows.push({
            produto_id: editing.id,
            url,
            alt: String(formData.get('nome') ?? editing.nome),
            ordem: order,
          })
        }
        setSaveStatus('Finalizando...')
        const { error: imageError } = await supabase.from('imagens_produtos').insert(rows)
        if (imageError) throw imageError
      }

      setSaveStatus('Atualizando lista...')
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      await queryClient.invalidateQueries({ queryKey: ['product'] })
      await queryClient.invalidateQueries({ queryKey: ['products'] })

      const productName = String(formData.get('nome') ?? editing.nome)
      setEditing(null)
      setEditImageFiles([])
      setEditExistingImages([])
      setSavingEdit(false)
      setSaveStatus('')
      notify('Produto atualizado')
      setSuccessModal({
        title: 'Produto atualizado',
        message: `"${productName}" foi atualizado com sucesso.`,
      })
    } catch (error) {
      notify(productSaveErrorMessage(error, 'Não foi possível atualizar o produto.'), 'error')
      setSavingEdit(false)
      setSaveStatus('')
    }
  }

  const onCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void createProduct(new FormData(event.currentTarget))
  }

  const onEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void handleEdit(new FormData(event.currentTarget))
  }

  return (
    <div className="relative grid gap-3">
      {(uploading || savingEdit) && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/45 p-4 backdrop-blur-[2px]">
          <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl bg-white px-6 py-8 text-center shadow-soft">
            <Loader2 className="h-10 w-10 animate-spin text-brand" />
            <div>
              <p className="font-display text-lg font-bold text-ink">
                {uploading ? 'Publicando produto' : 'Salvando alteracoes'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {saveStatus || 'Aguarde, isso pode levar alguns segundos...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {isCreateMode ? (
        <AdminCard>
          <AdminSectionHeader title="Cadastrar produto" description="Adicione um item ao catalogo" />
          <form
            ref={createFormRef}
            key={createFormKey}
            onSubmit={onCreateSubmit}
            onChange={(event) => saveCreateDraft(event.currentTarget)}
            className="grid gap-3 md:grid-cols-2"
          >
            <Input name="nome" placeholder="Nome do produto" defaultValue={createDraft?.nome} required />
            <Input name="marca" placeholder="Marca" defaultValue={createDraft?.marca} required />
            <Select
              name="categoria"
              defaultValue={createDraft?.categoria}
              required
              disabled={categories.length === 0}
            >
              {categories.length === 0 ? (
                <option value="">Cadastre categorias em Configuracoes</option>
              ) : (
                categories.map((category) => (
                  <option key={category}>{category}</option>
                ))
              )}
            </Select>
            <MaskedInput
              name="estoque"
              mask="integer"
              label="Estoque"
              placeholder="0"
              defaultValue={createDraft?.estoque ?? 0}
              required={createFlavors.length === 0}
              disabled={createFlavors.length > 0}
            />
            <MaskedInput
              name="preco"
              mask="currency"
              label="Preco"
              placeholder="R$ 0,00"
              defaultValue={createDraft?.preco}
              required
            />
            <MaskedInput
              name="preco_promocional"
              mask="currency"
              label="Preco promocional"
              placeholder="R$ 0,00"
              defaultValue={createDraft?.preco_promocional}
              optional
            />
            <MaskedInput
              name="peso_kg"
              mask="kg"
              label={`Peso (max. ${CORREIOS_MAX_WEIGHT_KG} kg)`}
              placeholder={`ate ${CORREIOS_MAX_WEIGHT_KG},000 kg`}
              defaultValue={createDraft?.peso_kg}
              required
            />
            <MaskedInput
              name="altura_cm"
              mask="cm"
              label="Altura"
              placeholder="0,0 cm"
              defaultValue={createDraft?.altura_cm}
              required
            />
            <MaskedInput
              name="largura_cm"
              mask="cm"
              label="Largura"
              placeholder="0,0 cm"
              defaultValue={createDraft?.largura_cm}
              required
            />
            <MaskedInput
              name="comprimento_cm"
              mask="cm"
              label="Comprimento"
              placeholder="0,0 cm"
              defaultValue={createDraft?.comprimento_cm}
              required
            />
            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-ink">Descrição do produto (opcional)</span>
              <textarea
                name="descricao"
                className="min-h-36 rounded-2xl border border-line bg-white p-4 outline-none transition placeholder:text-gray-400 focus:border-ink focus:ring-4 focus:ring-brand/20"
                placeholder="Escreva benefícios, modo de uso, ingredientes e outras informações importantes. Você pode usar várias linhas."
                defaultValue={createDraft?.descricao}
              />
              <span className="text-xs text-muted">Este conteúdo será exibido na página do produto.</span>
            </label>

            <div className="rounded-2xl border border-dashed border-line bg-[#fafaf8] p-4 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-ink">Sabores (opcional)</h3>
                  <p className="text-xs text-muted">Se cadastrar sabores, o cliente precisa escolher um na compra.</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCreateFlavors((current) => [...current, { nome: '', estoque: 0 }])}
                >
                  <Plus size={16} /> Adicionar sabor
                </Button>
              </div>
              <FlavorEditor flavors={createFlavors} onChange={setCreateFlavors} />
            </div>

            <div className="md:col-span-2">
              <ProductImagesField
                label="Fotos do produto"
                hint="Selecione varias imagens e escolha qual sera a capa do catalogo."
                files={createImageFiles}
                onFilesChange={handleCreateImagesChange}
                coverSource="new"
                onSetFileCover={(index) => {
                  const next = [...createImageFiles]
                  const [cover] = next.splice(index, 1)
                  handleCreateImagesChange([cover, ...next])
                }}
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input name="destaque" type="checkbox" defaultChecked={createDraft?.destaque} /> Produto em destaque
            </label>
            <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
              <Button
                type="button"
                variant="secondary"
                className="rounded-2xl"
                onClick={() => {
                  discardCreateDraft()
                  navigate('/admin/produtos')
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={uploading} className="rounded-2xl">
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Publicando...
                  </>
                ) : (
                  'Salvar produto'
                )}
              </Button>
            </div>
          </form>
        </AdminCard>
      ) : (
        <AdminCard>
          <AdminSectionHeader
            title="Gestao de produtos"
            description="Edite ou remova itens do catalogo"
            action={
              <Link
                to="/admin/produtos/novo"
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-sm font-bold text-ink shadow-brand transition hover:brightness-95"
              >
                <Plus size={16} />
                Novo produto
              </Link>
            }
          />
          {!isLoading && !productsFailed && products.length > 0 && (
            <label className="relative mb-3 block">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <Input
                type="search"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Pesquisar por nome, marca ou categoria"
                className="pl-10"
              />
            </label>
          )}
          {isLoading && <Skeleton className="h-40 rounded-2xl" />}
          {productsFailed && !isLoading && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-center">
              <p className="text-sm font-semibold text-red-800">Não foi possível carregar os produtos.</p>
              <p className="mt-1 text-xs text-red-700">
                {productsError instanceof Error ? productsError.message : 'Verifique a conexão e tente novamente.'}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                disabled={isFetching}
                onClick={() => void refetch()}
              >
                {isFetching ? <Loader2 size={16} className="animate-spin" /> : null}
                Tentar novamente
              </Button>
            </div>
          )}
          {!isLoading && !productsFailed && products.length === 0 && (
            <p className="rounded-2xl border border-dashed border-line bg-[#fafaf8] px-4 py-8 text-center text-sm text-muted">
              Nenhum produto cadastrado.{' '}
              <Link to="/admin/produtos/novo" className="font-semibold text-ink underline">
                Criar o primeiro
              </Link>
            </p>
          )}
          {!isLoading && !productsFailed && products.length > 0 && filteredProducts.length === 0 && (
            <p className="rounded-2xl border border-dashed border-line bg-[#fafaf8] px-4 py-8 text-center text-sm text-muted">
              Nenhum produto encontrado para “{productSearch}”.
            </p>
          )}
          <div className="grid gap-2.5">
            {filteredProducts.map((product) => {
              const inactive = product.ativo === false
              return (
                <AdminListRow
                  key={product.id}
                  className="text-sm md:grid-cols-[1fr_auto_auto] md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-ink">{product.nome}</strong>
                      {inactive && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
                          Oculto
                        </span>
                      )}
                    </div>
                    <p className="text-muted">
                      Estoque: {product.estoque} · {product.categoria}
                      {(product.produto_sabores?.length ?? 0) > 0
                        ? ` · ${product.produto_sabores?.length} sabores`
                        : ''}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => void openEdit(product)}>
                    <Pencil size={16} /> Editar
                  </Button>
                  {inactive ? (
                    <Button variant="secondary" onClick={() => void handleReactivate(product)}>
                      Reativar
                    </Button>
                  ) : (
                    <Button variant="danger" onClick={() => void handleDelete(product)}>
                      <Trash2 size={16} /> Remover
                    </Button>
                  )}
                </AdminListRow>
              )
            })}
          </div>
        </AdminCard>
      )}

      <Modal
        open={Boolean(editing)}
        title="Editar produto"
        size="xl"
        onClose={() => {
          setEditing(null)
          setEditFlavors([])
          setEditImageFiles([])
          setEditExistingImages([])
          setEditCoverSource('existing')
        }}
      >
        {editing && (
          <form key={editing.id} onSubmit={onEditSubmit} className="grid gap-3 md:grid-cols-2">
            <Input name="nome" placeholder="Nome do produto" defaultValue={editing.nome} required />
            <Input name="marca" placeholder="Marca" defaultValue={editing.marca} required />
            <Select name="categoria" defaultValue={editing.categoria} required disabled={categories.length === 0}>
              {categories.length === 0 ? (
                <option value="">Cadastre categorias em Configuracoes</option>
              ) : (
                categories.map((category) => (
                  <option key={category}>{category}</option>
                ))
              )}
            </Select>
            <MaskedInput
              name="estoque"
              mask="integer"
              label="Estoque"
              defaultValue={editing.estoque}
              required={editFlavors.length === 0}
              disabled={editFlavors.length > 0}
            />
            <MaskedInput name="preco" mask="currency" label="Preco" defaultValue={editing.preco} required />
            <MaskedInput
              name="preco_promocional"
              mask="currency"
              label="Preco promocional"
              defaultValue={editing.preco_promocional}
              optional
            />
            <MaskedInput
              name="peso_kg"
              mask="kg"
              label={`Peso (max. ${CORREIOS_MAX_WEIGHT_KG} kg)`}
              defaultValue={editing.peso_kg}
              required
            />
            <MaskedInput name="altura_cm" mask="cm" label="Altura" defaultValue={editing.altura_cm} required />
            <MaskedInput name="largura_cm" mask="cm" label="Largura" defaultValue={editing.largura_cm} required />
            <MaskedInput
              name="comprimento_cm"
              mask="cm"
              label="Comprimento"
              defaultValue={editing.comprimento_cm}
              required
            />
            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-ink">Descrição do produto (opcional)</span>
              <textarea
                name="descricao"
                className="min-h-36 rounded-2xl border border-line bg-white p-4 outline-none transition focus:border-ink focus:ring-4 focus:ring-brand/20"
                placeholder="Escreva benefícios, modo de uso, ingredientes e outras informações importantes."
                defaultValue={editing.descricao}
              />
              <span className="text-xs text-muted">Este conteúdo será exibido na página do produto.</span>
            </label>
            <div className="rounded-2xl border border-dashed border-line bg-[#fafaf8] p-4 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold text-ink">Sabores</h3>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditFlavors((current) => [...current, { nome: '', estoque: 0 }])}
                >
                  <Plus size={16} /> Adicionar sabor
                </Button>
              </div>
              <FlavorEditor flavors={editFlavors} onChange={setEditFlavors} />
            </div>
            <div className="md:col-span-2">
              <ProductImagesField
                label="Fotos do produto"
                hint="Mantenha, remova ou adicione fotos e escolha qual sera a capa."
                existing={editExistingImages}
                onRemoveExisting={(id) => {
                  setEditExistingImages((current) => {
                    const next = current.filter((image) => image.id !== id)
                    if (editCoverSource === 'existing' && current[0]?.id === id) {
                      setEditCoverSource(next.length > 0 ? 'existing' : 'new')
                    }
                    return next
                  })
                }}
                files={editImageFiles}
                onFilesChange={(files) => {
                  setEditImageFiles(files)
                  if (files.length === 0 && editCoverSource === 'new') {
                    setEditCoverSource('existing')
                  }
                }}
                coverSource={editCoverSource}
                onSetExistingCover={(id) => {
                  setEditExistingImages((current) => {
                    const selected = current.find((image) => image.id === id)
                    return selected ? [selected, ...current.filter((image) => image.id !== id)] : current
                  })
                  setEditCoverSource('existing')
                }}
                onSetFileCover={(index) => {
                  setEditImageFiles((current) => {
                    const next = [...current]
                    const [selected] = next.splice(index, 1)
                    return [selected, ...next]
                  })
                  setEditCoverSource('new')
                }}
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold md:col-span-2">
              <input name="destaque" type="checkbox" defaultChecked={editing.destaque} /> Produto em destaque
            </label>
            <div className="sticky bottom-0 -mx-5 mt-1 flex justify-end border-t border-line bg-white px-5 pt-3 pb-1 sm:-mx-6 sm:px-6 md:col-span-2">
              <Button type="submit" disabled={savingEdit} className="rounded-2xl">
                {savingEdit ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar alteracoes'
                )}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(successModal)}
        title={successModal?.title ?? 'Sucesso'}
        onClose={() => setSuccessModal(null)}
      >
        <div className="grid place-items-center gap-4 py-2 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-ink">
            <CheckCircle2 size={28} />
          </span>
          <p className="text-sm leading-relaxed text-muted">{successModal?.message}</p>
          <Button type="button" className="w-full rounded-2xl" onClick={() => setSuccessModal(null)}>
            Continuar
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function ProductImagesField({
  label,
  hint,
  existing = [],
  onRemoveExisting,
  files,
  onFilesChange,
  coverSource,
  onSetExistingCover,
  onSetFileCover,
}: {
  label: string
  hint: string
  existing?: ProductImage[]
  onRemoveExisting?: (id: string) => void
  files: File[]
  onFilesChange: (files: File[]) => void
  coverSource: 'existing' | 'new'
  onSetExistingCover?: (id: string) => void
  onSetFileCover: (index: number) => void
}) {
  const [previews, setPreviews] = useState<string[]>([])

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [files])

  const maxPhotos = 5

  const handlePick = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('image/'))
    if (picked.length === 0) return
    const remaining = Math.max(0, maxPhotos - existing.length - files.length)
    if (remaining === 0) {
      event.target.value = ''
      return
    }
    onFilesChange([...files, ...picked.slice(0, remaining)])
    event.target.value = ''
  }

  const total = existing.length + files.length
  const canAddMore = total < maxPhotos

  return (
    <div className="rounded-2xl border border-dashed border-line bg-[#fafaf8] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink">{label}</h3>
          <p className="text-xs text-muted">{hint} Maximo de {maxPhotos} fotos.</p>
          {total > 0 && (
            <p className="mt-1 text-xs font-semibold text-ink">
              {total}/{maxPhotos} foto{total === 1 ? '' : 's'}
            </p>
          )}
        </div>
        <label
          className={`inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition ${
            canAddMore ? 'cursor-pointer hover:border-ink' : 'cursor-not-allowed opacity-50'
          }`}
        >
          <ImagePlus size={16} />
          Adicionar fotos
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={!canAddMore}
            onChange={handlePick}
          />
        </label>
      </div>

      {total === 0 ? (
        <p className="mt-3 text-xs text-gray-500">Nenhuma foto selecionada ainda.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {existing.map((image, index) => {
            const isCover = coverSource === 'existing' && index === 0
            return (
            <div
              key={image.id}
              className="group relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white"
            >
              <img
                src={optimizeCloudinaryUrl(image.url, 320)}
                alt={image.alt ?? `Foto ${index + 1}`}
                className="aspect-square w-full object-cover"
              />
              {isCover && (
                <span className="absolute left-2 top-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
                  Capa
                </span>
              )}
              {!isCover && onSetExistingCover && (
                <button
                  type="button"
                  className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-ink shadow-sm transition hover:bg-brand"
                  onClick={() => onSetExistingCover(image.id)}
                >
                  Definir como capa
                </button>
              )}
              {onRemoveExisting && (
                <button
                  type="button"
                  aria-label="Remover foto"
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-ink/80 text-white opacity-90 transition hover:bg-red-600"
                  onClick={() => onRemoveExisting(image.id)}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            )
          })}
          {previews.map((preview, index) => {
            const isCover = coverSource === 'new' && index === 0
            return (
            <div
              key={`${preview}-${index}`}
              className="group relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white"
            >
              <img src={preview} alt={`Nova foto ${index + 1}`} className="aspect-square w-full object-cover" />
              {isCover && (
                <span className="absolute left-2 top-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
                  Capa
                </span>
              )}
              {!isCover && (
                <button
                  type="button"
                  className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-ink shadow-sm transition hover:bg-brand"
                  onClick={() => onSetFileCover(index)}
                >
                  Definir como capa
                </button>
              )}
              <button
                type="button"
                aria-label="Remover foto nova"
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-ink/80 text-white opacity-90 transition hover:bg-red-600"
                onClick={() => onFilesChange(files.filter((_, fileIndex) => fileIndex !== index))}
              >
                <X size={14} />
              </button>
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FlavorEditor({
  flavors,
  onChange,
}: {
  flavors: FlavorDraft[]
  onChange: (flavors: FlavorDraft[]) => void
}) {
  if (flavors.length === 0) {
    return <p className="mt-3 text-xs text-gray-500">Sem sabores = produto unico (sem escolha).</p>
  }

  return (
    <div className="mt-3 grid gap-2">
      {flavors.map((flavor, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
          <Input
            placeholder="Nome do sabor (ex: Chocolate)"
            value={flavor.nome}
            onChange={(event) => {
              const next = [...flavors]
              next[index] = { ...next[index], nome: event.target.value }
              onChange(next)
            }}
          />
          <Input
            inputMode="numeric"
            placeholder="Estoque"
            value={flavor.estoque === 0 ? '' : String(flavor.estoque)}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '').slice(0, 8)
              const next = [...flavors]
              next[index] = { ...next[index], estoque: digits ? Number(digits) : 0 }
              onChange(next)
            }}
          />
          <Button
            type="button"
            variant="danger"
            onClick={() => onChange(flavors.filter((_, flavorIndex) => flavorIndex !== index))}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ))}
    </div>
  )
}
