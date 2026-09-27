import { useEffect, useState, type ReactNode } from 'react'
import {
  FolderTree,
  ImagePlus,
  Loader2,
  Palette,
  Plus,
  Save,
  RotateCcw,
  Truck,
  Percent,
  Type,
  Phone,
  Megaphone,
  Trash2,
} from 'lucide-react'
import { AdminCard, AdminSectionHeader } from '../components/admin/AdminUI'
import { MaskedInput } from '../components/MaskedInput'
import { Button, Input, Skeleton, useConfirm, useToast } from '../components/ui'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { uploadToCloudinary } from '../services/cloudinary'
import { defaultSiteSettings, suggestedCategories, DEFAULT_CATEGORY_IMAGE, type SiteCategory, type SiteSettings } from '../types/settings'

type TabId = 'identidade' | 'cores' | 'categorias' | 'promocoes' | 'home' | 'contato'

const tabs: { id: TabId; label: string; icon: typeof Palette }[] = [
  { id: 'identidade', label: 'Identidade', icon: Type },
  { id: 'cores', label: 'Cores', icon: Palette },
  { id: 'categorias', label: 'Categorias', icon: FolderTree },
  { id: 'promocoes', label: 'Frete & Pix', icon: Truck },
  { id: 'home', label: 'Home & Textos', icon: Megaphone },
  { id: 'contato', label: 'Contato', icon: Phone },
]

export function AdminSettingsPage() {
  const { settings, loading, saveSettings } = useSiteSettings()
  const { notify } = useToast()
  const { confirm } = useConfirm()
  const [draft, setDraft] = useState<SiteSettings>(settings)
  const [tab, setTab] = useState<TabId>('identidade')
  const [saving, setSaving] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => {
    setDraft(settings)
    setFormKey((current) => current + 1)
  }, [settings])

  const update = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      if (draft.free_shipping_threshold < 0) {
        throw new Error('Valor do frete gratis invalido')
      }
      if (draft.pix_discount_percent < 0 || draft.pix_discount_percent > 100) {
        throw new Error('Percentual Pix deve estar entre 0 e 100')
      }
      const cleanedCategories = draft.categories
        .map((category) => ({
          ...category,
          name: category.name.trim(),
          label: category.label.trim().toUpperCase(),
          image: category.image.trim(),
        }))
        .filter((category) => category.name.length >= 2)
      const names = cleanedCategories.map((category) => category.name.toLowerCase())
      if (new Set(names).size !== names.length) {
        throw new Error('Existem categorias com o mesmo nome')
      }
      await saveSettings({ ...draft, categories: cleanedCategories })
      notify(
        cleanedCategories.length === 0
          ? 'Configuracoes salvas — nenhuma categoria ativa na loja'
          : 'Configuracoes salvas — a loja ja reflete as mudancas',
      )
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao salvar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    const ok = await confirm({
      title: 'Restaurar padrao',
      message: 'Restaurar todas as configuracoes para o padrao? Voce ainda precisa salvar depois.',
      confirmLabel: 'Restaurar',
      tone: 'danger',
    })
    if (!ok) return
    setDraft(defaultSiteSettings)
    setFormKey((current) => current + 1)
  }

  if (loading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-80 rounded-[1.35rem]" />
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <AdminCard className="!p-2.5 sm:!p-3">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                tab === id
                  ? 'bg-ink text-white shadow-sm'
                  : 'bg-[#f7f8f5] text-muted hover:bg-white hover:text-ink'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </AdminCard>

      <AdminCard>
        {tab === 'identidade' && (
          <div className="grid gap-6">
            <div>
              <AdminSectionHeader
                title="Identidade da loja"
                description="Nome, slogan e SEO basico"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome da loja">
                  <Input value={draft.store_name} onChange={(e) => update('store_name', e.target.value)} />
                </Field>
                <Field label="Nome curto (logo)">
                  <Input
                    value={draft.store_name_short}
                    onChange={(e) => update('store_name_short', e.target.value)}
                  />
                </Field>
                <Field label="Tagline abaixo do logo">
                  <Input value={draft.store_tagline} onChange={(e) => update('store_tagline', e.target.value)} />
                </Field>
                <Field label="Titulo SEO (aba do navegador)">
                  <Input value={draft.meta_title} onChange={(e) => update('meta_title', e.target.value)} />
                </Field>
                <Field label="Descricao SEO (inclua Betim)" className="md:col-span-2">
                  <Input
                    value={draft.meta_description}
                    onChange={(e) => update('meta_description', e.target.value)}
                    placeholder="Loja de suplementos em Betim: whey, creatina..."
                  />
                </Field>
                <Field label="Texto do rodape" className="md:col-span-2">
                  <textarea
                    className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-ink focus:ring-4 focus:ring-brand/20"
                    rows={3}
                    value={draft.footer_about}
                    onChange={(e) => update('footer_about', e.target.value)}
                  />
                </Field>
                <Field label="Selo de seguranca (rodape)">
                  <Input
                    value={draft.footer_secure_text}
                    onChange={(e) => update('footer_secure_text', e.target.value)}
                  />
                </Field>
              </div>
            </div>

            <div className="border-t border-line pt-6">
              <AdminSectionHeader
                title="Logo"
                description="Controle se a loja usa icone/imagem de marca"
              />
              <div className="grid gap-3">
                <Toggle
                  checked={draft.logo_enabled}
                  onChange={(checked) => update('logo_enabled', checked)}
                  label="Exibir logo (icone ou imagem)"
                />
                <Toggle
                  checked={draft.logo_show_text}
                  onChange={(checked) => update('logo_show_text', checked)}
                  label="Exibir nome e tagline ao lado do logo"
                />
                <Toggle
                  checked={draft.logo_as_favicon !== false}
                  onChange={(checked) => update('logo_as_favicon', checked)}
                  label="Usar logo como icone da aba do navegador (favicon)"
                />
              </div>

              {draft.logo_enabled && (
                <div className="mt-4 grid gap-4 rounded-2xl bg-[#f7f8f5] p-4 md:grid-cols-[120px_1fr]">
                  <div className="grid place-items-center overflow-hidden rounded-xl bg-ink p-3">
                    {draft.logo_url ? (
                      <img src={draft.logo_url} alt="Logo" className="max-h-16 max-w-full object-contain" />
                    ) : (
                      <span className="text-center text-[11px] text-white/50">Icone padrao</span>
                    )}
                  </div>
                  <div className="grid gap-3">
                    <Field label="URL da logo (opcional)">
                      <Input
                        value={draft.logo_url}
                        placeholder="Cole uma URL ou faca upload abaixo"
                        onChange={(e) => update('logo_url', e.target.value)}
                      />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-ink">
                        <ImagePlus size={16} />
                        {uploadingLogo ? 'Enviando...' : 'Upload da logo'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingLogo}
                          onChange={async (event) => {
                            const file = event.target.files?.[0]
                            if (!file) return
                            try {
                              setUploadingLogo(true)
                              const url = await uploadToCloudinary(file)
                              update('logo_url', url)
                              notify('Logo enviada — lembre de salvar as configuracoes')
                            } catch (error) {
                              notify(error instanceof Error ? error.message : 'Erro no upload', 'error')
                            } finally {
                              setUploadingLogo(false)
                              event.target.value = ''
                            }
                          }}
                        />
                      </label>
                      {draft.logo_url && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="rounded-full"
                          onClick={() => update('logo_url', '')}
                        >
                          Remover imagem
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted">
                      Sem imagem, o site usa o icone padrao. Ative &quot;icone da aba do navegador&quot; para
                      mostrar a logo tambem na aba do browser. Desligue &quot;Exibir logo&quot; para mostrar so o
                      texto no header.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'cores' && (
          <div className="grid gap-4">
            <AdminSectionHeader
              title="Cores do site"
              description="A marca muda em toda a loja ao salvar"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ColorField
                label="Cor principal"
                value={draft.color_brand}
                onChange={(value) => update('color_brand', value)}
              />
              <ColorField
                label="Cor hover"
                value={draft.color_brand_hover}
                onChange={(value) => update('color_brand_hover', value)}
              />
              <ColorField
                label="Cor escura (ink)"
                value={draft.color_ink}
                onChange={(value) => update('color_ink', value)}
              />
              <ColorField
                label="Cor de promocao"
                value={draft.color_promo}
                onChange={(value) => update('color_promo', value)}
              />
            </div>
            <div
              className="mt-2 overflow-hidden rounded-2xl border border-line p-5"
              style={{ background: draft.color_ink, color: '#fff' }}
            >
              <p className="text-xs uppercase tracking-wide opacity-60">Preview</p>
              <p className="mt-2 font-display text-2xl font-bold">
                {draft.store_name_short}{' '}
                <span style={{ color: draft.color_brand }}>{draft.store_tagline}</span>
              </p>
              <button
                type="button"
                className="mt-4 rounded-full px-5 py-2.5 text-sm font-bold"
                style={{ background: draft.color_brand, color: draft.color_ink }}
              >
                Botao de exemplo
              </button>
            </div>
          </div>
        )}

        {tab === 'categorias' && (
          <div className="grid gap-4">
            <AdminSectionHeader
              title="Categorias da loja"
              description="So aparecem no menu, home e catalogo depois de salvas aqui. Sem categorias, a loja nao mostra nenhuma."
              action={
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => update('categories', suggestedCategories.map((c) => ({ ...c })))}
                  >
                    {draft.categories.length === 0 ? 'Usar sugestoes' : 'Substituir por sugestoes'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() =>
                      update('categories', [
                        ...draft.categories,
                        {
                          name: '',
                          label: '',
                          image: DEFAULT_CATEGORY_IMAGE,
                          show_in_nav: true,
                        },
                      ])
                    }
                  >
                    <Plus size={16} /> Nova categoria
                  </Button>
                </div>
              }
            />

            {draft.categories.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line bg-surface px-4 py-8 text-center text-sm text-gray-500">
                Nenhuma categoria cadastrada. Adicione manualmente ou use as sugestoes e salve.
              </p>
            ) : (
              <div className="grid gap-3">
                {draft.categories.map((category, index) => (
                  <CategoryEditor
                    key={index}
                    category={category}
                    onChange={(next) => {
                      const categories = [...draft.categories]
                      categories[index] = next
                      update('categories', categories)
                    }}
                    onRemove={() => {
                      update(
                        'categories',
                        draft.categories.filter((_, current) => current !== index),
                      )
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'promocoes' && (
          <div className="grid gap-6">
            <div>
              <AdminSectionHeader
                title="Barra superior"
                description="Faixa preta no topo da loja"
              />
              <Toggle
                checked={draft.topbar_enabled}
                onChange={(checked) => update('topbar_enabled', checked)}
                label="Exibir barra superior"
              />
              <Field label="Texto da barra" className="mt-3">
                <Input value={draft.topbar_text} onChange={(e) => update('topbar_text', e.target.value)} />
              </Field>
            </div>

            <div className="border-t border-line pt-6">
              <AdminSectionHeader
                title="Frete gratis"
                description="Controle real no checkout + textos da loja"
              />
              <Toggle
                checked={draft.free_shipping_enabled}
                onChange={(checked) => update('free_shipping_enabled', checked)}
                label="Ativar frete gratis"
              />
              <div className="mt-3 grid gap-4 md:grid-cols-2" key={`fs-${formKey}`}>
                <MaskedInput
                  name="free_shipping_threshold"
                  mask="currency"
                  label="Pedido minimo"
                  defaultValue={draft.free_shipping_threshold}
                  onValueChange={(value) => update('free_shipping_threshold', value)}
                />
                <Field label="Nome da oferta">
                  <Input
                    value={draft.free_shipping_label}
                    onChange={(e) => update('free_shipping_label', e.target.value)}
                  />
                </Field>
              </div>
              <p className="mt-2 text-xs text-muted">
                Quando o subtotal atingir o minimo, as opcoes de frete ficam R$ 0,00 no checkout.
              </p>
            </div>

            <div className="border-t border-line pt-6">
              <AdminSectionHeader title="Desconto Pix" description="Desconto a vista no checkout" />
              <Toggle
                checked={draft.pix_discount_enabled}
                onChange={(checked) => update('pix_discount_enabled', checked)}
                label="Ativar desconto no Pix"
              />
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <Field label="Percentual (%)">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={draft.pix_discount_percent}
                    onChange={(e) => update('pix_discount_percent', Number(e.target.value) || 0)}
                  />
                </Field>
                <Field label="Texto das parcelas">
                  <Input
                    value={draft.installments_text}
                    onChange={(e) => update('installments_text', e.target.value)}
                  />
                </Field>
              </div>
            </div>

            <div className="border-t border-line pt-6">
              <AdminSectionHeader title="Banner promocional" description="Faixa extra opcional na home" />
              <Toggle
                checked={draft.promo_banner_enabled}
                onChange={(checked) => update('promo_banner_enabled', checked)}
                label="Exibir banner de promocao"
              />
              <Field label="Texto do banner" className="mt-3">
                <Input
                  value={draft.promo_banner_text}
                  onChange={(e) => update('promo_banner_text', e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {tab === 'home' && (
          <div className="grid gap-6">
            <div>
              <AdminSectionHeader title="Hero da home" description="Primeira dobra do site" />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Eyebrow (texto pequeno)">
                  <Input value={draft.hero_eyebrow} onChange={(e) => update('hero_eyebrow', e.target.value)} />
                </Field>
                <Field label="Texto do botao">
                  <Input value={draft.hero_cta_label} onChange={(e) => update('hero_cta_label', e.target.value)} />
                </Field>
                <Field label="Titulo (linha 1)" className="md:col-span-2">
                  <Input value={draft.hero_title} onChange={(e) => update('hero_title', e.target.value)} />
                </Field>
                <Field label="Titulo destaque (linha 2)" className="md:col-span-2">
                  <Input
                    value={draft.hero_title_highlight}
                    onChange={(e) => update('hero_title_highlight', e.target.value)}
                  />
                </Field>
                <Field label="Subtitulo" className="md:col-span-2">
                  <textarea
                    className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-ink focus:ring-4 focus:ring-brand/20"
                    rows={3}
                    value={draft.hero_subtitle}
                    onChange={(e) => update('hero_subtitle', e.target.value)}
                  />
                </Field>
                <Field label="URL da imagem do hero" className="md:col-span-2">
                  <Input
                    value={draft.hero_image_url}
                    onChange={(e) => update('hero_image_url', e.target.value)}
                  />
                </Field>
              </div>
            </div>

            <div className="border-t border-line pt-6">
              <AdminSectionHeader title="Faixa de beneficios" description="Pix / frete / cartao" />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Pix - titulo">
                  <Input
                    value={draft.benefit_pix_title}
                    onChange={(e) => update('benefit_pix_title', e.target.value)}
                  />
                </Field>
                <Field label="Pix - texto">
                  <Input
                    value={draft.benefit_pix_text}
                    onChange={(e) => update('benefit_pix_text', e.target.value)}
                  />
                </Field>
                <Field label="Frete - titulo">
                  <Input
                    value={draft.benefit_shipping_title}
                    onChange={(e) => update('benefit_shipping_title', e.target.value)}
                  />
                </Field>
                <Field label="Frete - texto">
                  <Input
                    value={draft.benefit_shipping_text}
                    onChange={(e) => update('benefit_shipping_text', e.target.value)}
                  />
                </Field>
                <Field label="Cartao - titulo">
                  <Input
                    value={draft.benefit_card_title}
                    onChange={(e) => update('benefit_card_title', e.target.value)}
                  />
                </Field>
                <Field label="Cartao - texto">
                  <Input
                    value={draft.benefit_card_text}
                    onChange={(e) => update('benefit_card_text', e.target.value)}
                  />
                </Field>
              </div>
            </div>

            <div className="border-t border-line pt-6">
              <AdminSectionHeader title="Faixa de confianca" description="4 itens abaixo do hero" />
              <div className="grid gap-4 md:grid-cols-2">
                {(
                  [
                    ['trust_1_title', 'trust_1_text', 'Item 1'],
                    ['trust_2_title', 'trust_2_text', 'Item 2'],
                    ['trust_3_title', 'trust_3_text', 'Item 3'],
                    ['trust_4_title', 'trust_4_text', 'Item 4'],
                  ] as const
                ).map(([titleKey, textKey, label]) => (
                  <div key={titleKey} className="grid gap-2 rounded-2xl bg-[#f7f8f5] p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
                    <Input value={draft[titleKey]} onChange={(e) => update(titleKey, e.target.value)} />
                    <Input value={draft[textKey]} onChange={(e) => update(textKey, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-line pt-6">
              <AdminSectionHeader title="Newsletter" description="Bloco de captura de e-mail" />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Titulo">
                  <Input
                    value={draft.newsletter_title}
                    onChange={(e) => update('newsletter_title', e.target.value)}
                  />
                </Field>
                <Field label="Subtitulo">
                  <Input
                    value={draft.newsletter_subtitle}
                    onChange={(e) => update('newsletter_subtitle', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </div>
        )}

        {tab === 'contato' && (
          <div className="grid gap-4">
            <AdminSectionHeader
              title="Atendimento"
              description="WhatsApp e e-mail exibidos na loja"
            />
            <Toggle
              checked={draft.whatsapp_button_enabled}
              onChange={(checked) => update('whatsapp_button_enabled', checked)}
              label="Exibir botao flutuante de WhatsApp"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="WhatsApp (somente numeros, com DDI)">
                <Input
                  value={draft.whatsapp_number}
                  onChange={(e) => update('whatsapp_number', e.target.value.replace(/\D/g, ''))}
                  placeholder="5511999999999"
                />
              </Field>
              <Field label="E-mail de contato">
                <Input
                  type="email"
                  value={draft.support_email}
                  onChange={(e) => update('support_email', e.target.value)}
                />
              </Field>
              <Field label="Mensagem padrao do WhatsApp" className="md:col-span-2">
                <Input
                  value={draft.whatsapp_message}
                  onChange={(e) => update('whatsapp_message', e.target.value)}
                />
              </Field>
            </div>
            <p className="text-xs text-muted">
              O botao verde fica fixo no canto da loja. Desligue se nao quiser exibir.
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
          <span className="mr-auto flex items-center gap-2 text-xs text-muted">
            <Percent size={12} />
            Mudancas aparecem na loja imediatamente apos salvar
          </span>
          <Button type="button" variant="secondary" onClick={handleReset} className="rounded-2xl">
            <RotateCcw size={16} />
            Restaurar padrao
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving} className="rounded-2xl">
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar configuracoes'}
          </Button>
        </div>
      </AdminCard>
    </div>
  )
}

function CategoryEditor({
  category,
  onChange,
  onRemove,
}: {
  category: SiteCategory
  onChange: (category: SiteCategory) => void
  onRemove: () => void
}) {
  const { notify } = useToast()
  const [uploading, setUploading] = useState(false)

  return (
    <div className="grid gap-3 rounded-2xl border border-black/[0.05] bg-[#f7f8f5] p-4 md:grid-cols-[88px_1fr_auto]">
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-black/[0.04]">
        {category.image ? (
          <img src={category.image} alt="" className="h-20 w-full object-cover md:h-full" />
        ) : (
          <div className="grid h-20 place-items-center text-xs text-muted md:h-full">Sem imagem</div>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Nome (produtos / filtro)">
          <Input
            value={category.name}
            placeholder="Ex: Creatina"
            onChange={(e) => onChange({ ...category, name: e.target.value })}
          />
        </Field>
        <Field label="Label do menu">
          <Input
            value={category.label}
            placeholder="Ex: CREATINA"
            onChange={(e) => onChange({ ...category, label: e.target.value })}
          />
        </Field>
        <Field label="URL da imagem" className="sm:col-span-2">
          <Input
            value={category.image}
            placeholder="Cole uma URL ou faca upload abaixo"
            onChange={(e) => onChange({ ...category, image: e.target.value })}
          />
        </Field>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <label
            className={`inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-ink ${
              uploading ? 'cursor-wait opacity-70' : 'cursor-pointer'
            }`}
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
            {uploading ? 'Enviando...' : 'Upload da imagem'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                try {
                  setUploading(true)
                  const url = await uploadToCloudinary(file)
                  onChange({ ...category, image: url })
                  notify('Imagem enviada — lembre de salvar as configuracoes')
                } catch (error) {
                  notify(error instanceof Error ? error.message : 'Erro no upload', 'error')
                } finally {
                  setUploading(false)
                  event.target.value = ''
                }
              }}
            />
          </label>
          {category.image && (
            <Button
              type="button"
              variant="secondary"
              className="rounded-full"
              disabled={uploading}
              onClick={() => onChange({ ...category, image: '' })}
            >
              Remover imagem
            </Button>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink sm:col-span-2">
          <input
            type="checkbox"
            checked={category.show_in_nav}
            onChange={(e) => onChange({ ...category, show_in_nav: e.target.checked })}
          />
          Mostrar no menu superior
        </label>
      </div>
      <Button type="button" variant="danger" className="h-fit self-start rounded-2xl" onClick={onRemove}>
        <Trash2 size={16} />
      </Button>
    </div>
  )
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">{label}</label>
      {children}
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="border-0 shadow-none focus:ring-0" />
      </div>
    </Field>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-2xl bg-[#f7f8f5] px-4 py-3 text-left"
    >
      <span className="text-sm font-semibold text-ink">{label}</span>
      <span
        className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-brand' : 'bg-zinc-300'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? 'left-5' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}
