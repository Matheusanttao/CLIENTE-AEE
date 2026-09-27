import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ImagePlus, Loader2, Package, Pencil, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  AdminCard,
  AdminEmptyState,
  AdminField,
  AdminFormSection,
  AdminListRow,
  AdminPill,
  AdminSectionHeader,
} from '../components/admin/AdminUI'
import { adminButtonClass, adminTextareaClass } from '../components/admin/adminStyles'
import { MaskedInput } from '../components/MaskedInput'
import { Button, Input, Modal, Select, useConfirm, useToast } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { CORREIOS_MAX_WEIGHT_KG } from '../lib/constants'
import { optimizeCloudinaryUrl } from '../lib/cloudinary'
import { supabase } from '../lib/supabase'
import { deleteProduct, reactivateProduct, updateProduct } from '../services/admin'
import { uploadToCloudinary } from '../services/cloudinary'
import { getFlavorsByProduct, replaceProductFlavors } from '../services/flavors'
import type { Product, ProductCategory, ProductImage } from '../types'
import { cn } from '../utils/cn'
import { formatCurrency } from '../utils/format'
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
  if (parsed == null || parsed < 0) throw new Error(`Informe um valor válido para ${label}`)
  return parsed
}

function productSaveErrorMessage(error: unknown, fallback: string) {
  const details =
    typeof error === 'object' && error !== null
      ? (error as { code?: string; message?: string })
      : null
  const message = details?.message ?? (error instanceof Error ? error.message : '')

  if (details?.code === '23505' || message.includes('produtos_slug_key')) {
    return 'Já existe um produto com esse nome. Para diferenciar, inclua no nome o modelo, a cor ou o volume. Exemplo: Tênis Casual Branco ou Perfume Amber 100 ml.'
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

      const preco = parseRequiredNumber(formData.get('preco'), 'preço')
      if (preco <= 0) throw new Error('Informe um preço válido')

      const pesoKg = parseRequiredNumber(formData.get('peso_kg'), 'peso')
      const alturaCm = parseRequiredNumber(formData.get('altura_cm'), 'altura')
      const larguraCm = parseRequiredNumber(formData.get('largura_cm'), 'largura')
      const comprimentoCm = parseRequiredNumber(formData.get('comprimento_cm'), 'comprimento')
      if (pesoKg <= 0 || alturaCm <= 0 || larguraCm <= 0 || comprimentoCm <= 0) {
        throw new Error('Peso e medidas precisam ser maiores que zero')
      }
      if (pesoKg > CORREIOS_MAX_WEIGHT_KG) {
        throw new Error(`Peso máximo permitido pelos Correios: ${CORREIOS_MAX_WEIGHT_KG} kg`)
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
        setSaveStatus('Salvando variações...')
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
        message: `"${nome}" foi cadastrado no catálogo com sucesso.`,
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
      message: `Se "${product.nome}" nunca foi vendido, será excluído. Se já entrou em algum pedido, será apenas ocultado da loja (o histórico permanece).`,
      confirmLabel: 'Remover',
      tone: 'danger',
    })
    if (!ok) return
    try {
      const result = await deleteProduct(product.id)
      notify(
        result.mode === 'deleted'
          ? 'Produto excluído'
          : 'Produto ocultado da loja (já havia vendas vinculadas)',
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

      const preco = parseRequiredNumber(formData.get('preco'), 'preço')
      if (preco <= 0) throw new Error('Informe um preço válido')

      const pesoKg = parseRequiredNumber(formData.get('peso_kg'), 'peso')
      const alturaCm = parseRequiredNumber(formData.get('altura_cm'), 'altura')
      const larguraCm = parseRequiredNumber(formData.get('largura_cm'), 'largura')
      const comprimentoCm = parseRequiredNumber(formData.get('comprimento_cm'), 'comprimento')
      if (pesoKg <= 0 || alturaCm <= 0 || larguraCm <= 0 || comprimentoCm <= 0) {
        throw new Error('Peso e medidas precisam ser maiores que zero')
      }
      if (pesoKg > CORREIOS_MAX_WEIGHT_KG) {
        throw new Error(`Peso máximo permitido pelos Correios: ${CORREIOS_MAX_WEIGHT_KG} kg`)
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
      setSaveStatus('Salvando variações...')
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

  const closeEditModal = () => {
    setEditing(null)
    setEditFlavors([])
    setEditImageFiles([])
    setEditExistingImages([])
    setEditCoverSource('existing')
  }

  const categoryOptions =
    categories.length === 0 ? (
      <option value="">Cadastre categorias em Configurações</option>
    ) : (
      categories.map((category) => <option key={category}>{category}</option>)
    )

  const categoryHint =
    categories.length === 0 ? (
      <>
        Nenhuma categoria cadastrada.{' '}
        <Link to="/admin/configuracoes" className="font-semibold text-brand hover:text-brand-hover">
          Criar em Configurações
        </Link>
      </>
    ) : undefined

  return (
    <div className="relative grid gap-4 sm:gap-5">
      {(uploading || savingEdit) && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/40 p-4">
          <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-line bg-white px-6 py-8 text-center shadow-soft">
            <Loader2 className="h-10 w-10 animate-spin text-brand" />
            <div>
              <p className="text-lg font-semibold text-ink">
                {uploading ? 'Publicando produto' : 'Salvando alterações'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {saveStatus || 'Aguarde, isso pode levar alguns segundos...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {isCreateMode ? (
        <form
          ref={createFormRef}
          key={createFormKey}
          onSubmit={onCreateSubmit}
          onChange={(event) => saveCreateDraft(event.currentTarget)}
          className="grid items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"
        >
          <div className="grid min-w-0 gap-4 sm:gap-5">
            <AdminFormSection
              title="Informações básicas"
              description="Nome, marca, categoria e descrição exibidos na loja."
              className="shadow-card"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <AdminField label="Nome do produto" required className="md:col-span-2">
                  <Input
                    name="nome"
                    placeholder="Ex.: Tênis Casual Branco"
                    defaultValue={createDraft?.nome}
                    required
                  />
                </AdminField>
                <AdminField label="Marca" required>
                  <Input name="marca" placeholder="Ex.: Nome da marca" defaultValue={createDraft?.marca} required />
                </AdminField>
                <AdminField label="Categoria" required hint={categoryHint}>
                  <Select
                    name="categoria"
                    defaultValue={createDraft?.categoria}
                    required
                    disabled={categories.length === 0}
                  >
                    {categoryOptions}
                  </Select>
                </AdminField>
                <AdminField
                  label="Descrição do produto"
                  optional
                  className="md:col-span-2"
                  hint="Este conteúdo será exibido na página do produto."
                >
                  <textarea
                    name="descricao"
                    className={cn(adminTextareaClass, 'min-h-40')}
                    placeholder="Descreva materiais, numeração, notas olfativas, cuidados e outras informações importantes. Você pode usar várias linhas."
                    defaultValue={createDraft?.descricao}
                  />
                </AdminField>
              </div>
            </AdminFormSection>

            <ProductImagesField
              label="Fotos do produto"
              hint="Selecione várias imagens e escolha qual será a capa do catálogo."
              className="shadow-card"
              files={createImageFiles}
              onFilesChange={handleCreateImagesChange}
              coverSource="new"
              onSetFileCover={(index) => {
                const next = [...createImageFiles]
                const [cover] = next.splice(index, 1)
                handleCreateImagesChange([cover, ...next])
              }}
            />

            <AdminFormSection
              title="Variações (tamanho, cor, volume...)"
              description="Opcional. Com variações, o cliente escolhe uma na compra e o estoque passa a ser a soma delas."
              className="shadow-card"
              action={
                <button
                  type="button"
                  className={adminButtonClass('secondary', 'sm')}
                  onClick={() => setCreateFlavors((current) => [...current, { nome: '', estoque: 0 }])}
                >
                  <Plus size={16} /> Adicionar variação
                </button>
              }
            >
              <FlavorEditor flavors={createFlavors} onChange={setCreateFlavors} />
            </AdminFormSection>
          </div>

          <div className="grid min-w-0 gap-4 sm:gap-5">
            <AdminFormSection title="Preço e estoque" className="shadow-card">
              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
                <AdminField label="Preço" required>
                  <MaskedInput
                    name="preco"
                    mask="currency"
                    placeholder="R$ 0,00"
                    defaultValue={createDraft?.preco}
                    required
                  />
                </AdminField>
                <AdminField label="Preço promocional" optional>
                  <MaskedInput
                    name="preco_promocional"
                    mask="currency"
                    placeholder="R$ 0,00"
                    defaultValue={createDraft?.preco_promocional}
                    optional
                  />
                </AdminField>
                <AdminField
                  label="Estoque"
                  required={createFlavors.length === 0}
                  hint={createFlavors.length > 0 ? 'Calculado pela soma das variações.' : undefined}
                >
                  <MaskedInput
                    name="estoque"
                    mask="integer"
                    placeholder="0"
                    defaultValue={createDraft?.estoque ?? 0}
                    required={createFlavors.length === 0}
                    disabled={createFlavors.length > 0}
                  />
                </AdminField>
              </div>
            </AdminFormSection>

            <AdminFormSection
              title="Envio"
              description="Peso e medidas da embalagem, usados no cálculo do frete."
              className="shadow-card"
            >
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-2">
                <AdminField label={`Peso (máx. ${CORREIOS_MAX_WEIGHT_KG} kg)`} required className="col-span-2 lg:col-span-1 xl:col-span-2">
                  <MaskedInput
                    name="peso_kg"
                    mask="kg"
                    placeholder={`até ${CORREIOS_MAX_WEIGHT_KG},000 kg`}
                    defaultValue={createDraft?.peso_kg}
                    required
                  />
                </AdminField>
                <AdminField label="Altura" required>
                  <MaskedInput
                    name="altura_cm"
                    mask="cm"
                    placeholder="0,0 cm"
                    defaultValue={createDraft?.altura_cm}
                    required
                  />
                </AdminField>
                <AdminField label="Largura" required>
                  <MaskedInput
                    name="largura_cm"
                    mask="cm"
                    placeholder="0,0 cm"
                    defaultValue={createDraft?.largura_cm}
                    required
                  />
                </AdminField>
                <AdminField label="Comprimento" required className="col-span-2 lg:col-span-1 xl:col-span-2">
                  <MaskedInput
                    name="comprimento_cm"
                    mask="cm"
                    placeholder="0,0 cm"
                    defaultValue={createDraft?.comprimento_cm}
                    required
                  />
                </AdminField>
              </div>
            </AdminFormSection>

            <AdminFormSection title="Visibilidade" className="shadow-card">
              <FeaturedCheckbox defaultChecked={createDraft?.destaque} />
            </AdminFormSection>
          </div>

          <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-soft backdrop-blur xl:col-span-2">
            <p className="hidden text-sm text-muted sm:block">
              Os campos ficam salvos como rascunho neste navegador enquanto você preenche.
            </p>
            <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
              <Button
                type="button"
                variant="secondary"
                className="flex-1 sm:flex-none"
                onClick={() => {
                  discardCreateDraft()
                  navigate('/admin/produtos')
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={uploading} className="flex-1 sm:flex-none">
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
          </div>
        </form>
      ) : (
        <AdminCard>
          <AdminSectionHeader
            title="Catálogo"
            description={
              products.length > 0
                ? `${products.length} ${products.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'}`
                : 'Edite, oculte ou remova itens do catálogo.'
            }
            action={
              <Link to="/admin/produtos/novo" className={adminButtonClass('primary', 'md')}>
                <Plus size={16} />
                Novo produto
              </Link>
            }
          />
          {!isLoading && !productsFailed && products.length > 0 && (
            <label className="relative mb-4 block">
              <span className="sr-only">Pesquisar produtos</span>
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Pesquisar por nome, marca ou categoria"
                className="w-full rounded-xl border border-transparent bg-surface py-3 pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-muted focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15"
              />
            </label>
          )}
          {isLoading && (
            <div className="grid gap-2.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-[88px] animate-pulse rounded-xl bg-surface" />
              ))}
            </div>
          )}
          {productsFailed && !isLoading && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center">
              <p className="text-sm font-semibold text-red-800">Não foi possível carregar os produtos.</p>
              <p className="mt-1 text-sm text-red-700">
                {productsError instanceof Error ? productsError.message : 'Verifique a conexão e tente novamente.'}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-4"
                disabled={isFetching}
                onClick={() => void refetch()}
              >
                {isFetching ? <Loader2 size={16} className="animate-spin" /> : null}
                Tentar novamente
              </Button>
            </div>
          )}
          {!isLoading && !productsFailed && products.length === 0 && (
            <AdminEmptyState
              icon={<Package size={20} />}
              title="Nenhum produto cadastrado"
              description="Cadastre tênis, perfumes e outros itens para exibir na loja."
              action={
                <Link to="/admin/produtos/novo" className={adminButtonClass('primary', 'sm')}>
                  <Plus size={16} />
                  Criar o primeiro
                </Link>
              }
            />
          )}
          {!isLoading && !productsFailed && products.length > 0 && filteredProducts.length === 0 && (
            <AdminEmptyState
              icon={<Search size={20} />}
              title={`Nenhum produto encontrado para “${productSearch}”`}
              description="Tente outro nome, marca ou categoria."
            />
          )}
          <div className="grid gap-2.5">
            {filteredProducts.map((product) => {
              const inactive = product.ativo === false
              const cover = [...(product.imagens_produtos ?? [])].sort((a, b) => a.ordem - b.ordem)[0]
              const variations = product.produto_sabores?.length ?? 0
              const hasPromo =
                product.preco_promocional != null &&
                Number(product.preco_promocional) > 0 &&
                Number(product.preco_promocional) < Number(product.preco)
              return (
                <AdminListRow
                  key={product.id}
                  muted={inactive}
                  className="sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-sand-soft">
                      {cover ? (
                        <img
                          src={optimizeCloudinaryUrl(cover.url, 160)}
                          alt={cover.alt ?? product.nome}
                          loading="lazy"
                          className={cn('h-full w-full object-cover', inactive && 'opacity-60')}
                        />
                      ) : (
                        <Package size={20} className="text-muted" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <strong className="min-w-0 truncate text-sm font-semibold text-ink sm:text-[15px]">
                          {product.nome}
                        </strong>
                        {inactive && <AdminPill>Oculto</AdminPill>}
                        {product.destaque && !inactive && <AdminPill tone="brand">Destaque</AdminPill>}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted">
                        {[product.marca, product.categoria].filter(Boolean).join(' · ')}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
                        <span className="font-semibold tabular-nums text-ink">
                          {formatCurrency(hasPromo ? Number(product.preco_promocional) : Number(product.preco))}
                        </span>
                        {hasPromo && (
                          <span className="tabular-nums text-muted line-through">
                            {formatCurrency(Number(product.preco))}
                          </span>
                        )}
                        <span className={product.estoque <= 5 ? 'font-medium text-amber-700' : 'text-muted'}>
                          Estoque: {product.estoque}
                        </span>
                        {variations > 0 && (
                          <span className="text-muted">
                            {variations} {variations === 1 ? 'variação' : 'variações'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:justify-end">
                    <button
                      type="button"
                      className={adminButtonClass('secondary', 'sm', 'flex-1 sm:flex-none')}
                      onClick={() => void openEdit(product)}
                    >
                      <Pencil size={15} /> Editar
                    </button>
                    {inactive ? (
                      <button
                        type="button"
                        className={adminButtonClass('secondary', 'sm', 'flex-1 sm:flex-none')}
                        onClick={() => void handleReactivate(product)}
                      >
                        <RotateCcw size={15} /> Reativar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={adminButtonClass('danger', 'sm', 'flex-1 sm:flex-none')}
                        onClick={() => void handleDelete(product)}
                      >
                        <Trash2 size={15} /> Remover
                      </button>
                    )}
                  </div>
                </AdminListRow>
              )
            })}
          </div>
        </AdminCard>
      )}

      <Modal open={Boolean(editing)} title="Editar produto" size="xl" onClose={closeEditModal}>
        {editing && (
          <form
            key={editing.id}
            onSubmit={onEditSubmit}
            className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"
          >
            <div className="grid min-w-0 gap-4">
              <AdminFormSection title="Informações básicas">
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminField label="Nome do produto" required className="md:col-span-2">
                    <Input name="nome" placeholder="Nome do produto" defaultValue={editing.nome} required />
                  </AdminField>
                  <AdminField label="Marca" required>
                    <Input name="marca" placeholder="Marca" defaultValue={editing.marca} required />
                  </AdminField>
                  <AdminField label="Categoria" required hint={categoryHint}>
                    <Select
                      name="categoria"
                      defaultValue={editing.categoria}
                      required
                      disabled={categories.length === 0}
                    >
                      {categoryOptions}
                    </Select>
                  </AdminField>
                  <AdminField
                    label="Descrição do produto"
                    optional
                    className="md:col-span-2"
                    hint="Este conteúdo será exibido na página do produto."
                  >
                    <textarea
                      name="descricao"
                      className={cn(adminTextareaClass, 'min-h-40')}
                      placeholder="Descreva materiais, numeração, notas olfativas, cuidados e outras informações importantes."
                      defaultValue={editing.descricao}
                    />
                  </AdminField>
                </div>
              </AdminFormSection>

              <ProductImagesField
                label="Fotos do produto"
                hint="Mantenha, remova ou adicione fotos e escolha qual será a capa."
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

              <AdminFormSection
                title="Variações (tamanho, cor, volume...)"
                description="Com variações, o cliente escolhe uma na compra e o estoque passa a ser a soma delas."
                action={
                  <button
                    type="button"
                    className={adminButtonClass('secondary', 'sm')}
                    onClick={() => setEditFlavors((current) => [...current, { nome: '', estoque: 0 }])}
                  >
                    <Plus size={16} /> Adicionar variação
                  </button>
                }
              >
                <FlavorEditor flavors={editFlavors} onChange={setEditFlavors} />
              </AdminFormSection>
            </div>

            <div className="grid min-w-0 gap-4">
              <AdminFormSection title="Preço e estoque">
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
                  <AdminField label="Preço" required>
                    <MaskedInput name="preco" mask="currency" defaultValue={editing.preco} required />
                  </AdminField>
                  <AdminField label="Preço promocional" optional>
                    <MaskedInput
                      name="preco_promocional"
                      mask="currency"
                      defaultValue={editing.preco_promocional}
                      optional
                    />
                  </AdminField>
                  <AdminField
                    label="Estoque"
                    required={editFlavors.length === 0}
                    hint={editFlavors.length > 0 ? 'Calculado pela soma das variações.' : undefined}
                  >
                    <MaskedInput
                      name="estoque"
                      mask="integer"
                      defaultValue={editing.estoque}
                      required={editFlavors.length === 0}
                      disabled={editFlavors.length > 0}
                    />
                  </AdminField>
                </div>
              </AdminFormSection>

              <AdminFormSection title="Envio" description="Peso e medidas da embalagem para o frete.">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-2">
                  <AdminField
                    label={`Peso (máx. ${CORREIOS_MAX_WEIGHT_KG} kg)`}
                    required
                    className="col-span-2 md:col-span-1 lg:col-span-2"
                  >
                    <MaskedInput name="peso_kg" mask="kg" defaultValue={editing.peso_kg} required />
                  </AdminField>
                  <AdminField label="Altura" required>
                    <MaskedInput name="altura_cm" mask="cm" defaultValue={editing.altura_cm} required />
                  </AdminField>
                  <AdminField label="Largura" required>
                    <MaskedInput name="largura_cm" mask="cm" defaultValue={editing.largura_cm} required />
                  </AdminField>
                  <AdminField label="Comprimento" required className="col-span-2 md:col-span-1 lg:col-span-2">
                    <MaskedInput
                      name="comprimento_cm"
                      mask="cm"
                      defaultValue={editing.comprimento_cm}
                      required
                    />
                  </AdminField>
                </div>
              </AdminFormSection>

              <AdminFormSection title="Visibilidade">
                <FeaturedCheckbox defaultChecked={editing.destaque} />
              </AdminFormSection>
            </div>

            <div className="sticky bottom-0 z-10 -mx-5 -mb-4 flex justify-end gap-2 border-t border-line bg-white px-5 py-3 sm:-mx-6 sm:-mb-5 sm:px-6 lg:col-span-2">
              <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={closeEditModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingEdit} className="flex-1 sm:flex-none">
                {savingEdit ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar alterações'
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
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-mint text-brand">
            <CheckCircle2 size={28} />
          </span>
          <p className="text-[15px] leading-relaxed text-muted">{successModal?.message}</p>
          <Button type="button" className="w-full" onClick={() => setSuccessModal(null)}>
            Continuar
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function FeaturedCheckbox({ defaultChecked }: { defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4 transition hover:border-[#D0D5DD] hover:bg-surface/60">
      <input
        name="destaque"
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">Produto em destaque</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">
          Pode aparecer nas vitrines de destaque da página inicial.
        </span>
      </span>
    </label>
  )
}

function ProductImagesField({
  label,
  hint,
  className,
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
  className?: string
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
    <AdminFormSection
      title={label}
      description={`${hint} Máximo de ${maxPhotos} fotos.`}
      className={className}
      action={
        total > 0 ? (
          <label
            className={adminButtonClass(
              'secondary',
              'sm',
              canAddMore ? 'cursor-pointer' : 'pointer-events-none cursor-not-allowed opacity-50',
            )}
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
        ) : undefined
      }
    >
      {total === 0 ? (
        <label className="grid cursor-pointer place-items-center gap-2 rounded-xl border border-dashed border-[#D0D5DD] bg-surface/50 px-4 py-10 text-center transition hover:border-brand hover:bg-brand-mint/60">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-brand ring-1 ring-line">
            <ImagePlus size={20} />
          </span>
          <span className="text-sm font-semibold text-ink">Clique para adicionar fotos</span>
          <span className="text-xs text-muted">JPG, PNG ou WEBP · até {maxPhotos} imagens</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handlePick} />
        </label>
      ) : (
        <>
          <p className="mb-3 text-xs font-medium text-muted">
            {total}/{maxPhotos} foto{total === 1 ? '' : 's'} · a primeira é a capa
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
            {existing.map((image, index) => {
              const isCover = coverSource === 'existing' && index === 0
              return (
                <PhotoTile
                  key={image.id}
                  src={optimizeCloudinaryUrl(image.url, 320)}
                  alt={image.alt ?? `Foto ${index + 1}`}
                  isCover={isCover}
                  onSetCover={!isCover && onSetExistingCover ? () => onSetExistingCover(image.id) : undefined}
                  onRemove={onRemoveExisting ? () => onRemoveExisting(image.id) : undefined}
                  removeLabel="Remover foto"
                />
              )
            })}
            {previews.map((preview, index) => {
              const isCover = coverSource === 'new' && index === 0
              return (
                <PhotoTile
                  key={`${preview}-${index}`}
                  src={preview}
                  alt={`Nova foto ${index + 1}`}
                  isCover={isCover}
                  isNew
                  onSetCover={!isCover ? () => onSetFileCover(index) : undefined}
                  onRemove={() => onFilesChange(files.filter((_, fileIndex) => fileIndex !== index))}
                  removeLabel="Remover foto nova"
                />
              )
            })}
          </div>
        </>
      )}
    </AdminFormSection>
  )
}

function PhotoTile({
  src,
  alt,
  isCover,
  isNew = false,
  onSetCover,
  onRemove,
  removeLabel,
}: {
  src: string
  alt: string
  isCover: boolean
  isNew?: boolean
  onSetCover?: () => void
  onRemove?: () => void
  removeLabel: string
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-sand-soft',
        isCover ? 'border-brand ring-2 ring-brand/20' : 'border-line',
      )}
    >
      <img src={src} alt={alt} className="aspect-square w-full object-cover" />
      <div className="absolute left-2 top-2 flex flex-wrap gap-1">
        {isCover && (
          <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">Capa</span>
        )}
        {isNew && !isCover && (
          <span className="rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-ink-soft shadow-sm">
            Nova
          </span>
        )}
      </div>
      {onSetCover && (
        <button
          type="button"
          className="absolute inset-x-2 bottom-2 min-h-8 rounded-lg bg-white/95 px-2 py-1 text-xs font-semibold text-ink shadow-sm transition hover:bg-brand hover:text-white"
          onClick={onSetCover}
        >
          Definir como capa
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          aria-label={removeLabel}
          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-ink shadow-sm transition hover:bg-danger hover:text-white"
          onClick={onRemove}
        >
          <X size={16} />
        </button>
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
    return (
      <p className="rounded-xl border border-dashed border-line bg-surface/50 px-4 py-5 text-center text-sm text-muted">
        Sem variações, o produto é vendido como item único (sem escolha).
      </p>
    )
  }

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-[minmax(0,1fr)_88px_44px] gap-2 px-1 text-xs font-medium text-muted sm:grid-cols-[minmax(0,1fr)_140px_44px]">
        <span>Variação</span>
        <span>Estoque</span>
        <span className="sr-only">Ações</span>
      </div>
      {flavors.map((flavor, index) => (
        <div
          key={index}
          className="grid grid-cols-[minmax(0,1fr)_88px_44px] items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_140px_44px]"
        >
          <Input
            aria-label={`Nome da variação ${index + 1}`}
            placeholder="Ex.: 42, Preto ou 100 ml"
            value={flavor.nome}
            onChange={(event) => {
              const next = [...flavors]
              next[index] = { ...next[index], nome: event.target.value }
              onChange(next)
            }}
          />
          <Input
            aria-label={`Estoque da variação ${index + 1}`}
            inputMode="numeric"
            placeholder="0"
            value={flavor.estoque === 0 ? '' : String(flavor.estoque)}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '').slice(0, 8)
              const next = [...flavors]
              next[index] = { ...next[index], estoque: digits ? Number(digits) : 0 }
              onChange(next)
            }}
          />
          <button
            type="button"
            aria-label={`Remover variação ${index + 1}`}
            className="grid place-items-center rounded-xl border border-line bg-white text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-danger"
            onClick={() => onChange(flavors.filter((_, flavorIndex) => flavorIndex !== index))}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
