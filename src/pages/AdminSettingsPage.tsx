import { useEffect, useState } from 'react'
import {
  FolderTree,
  ImagePlus,
  Loader2,
  Palette,
  Plus,
  Save,
  RotateCcw,
  Truck,
  Type,
  Phone,
  Megaphone,
  Trash2,
} from 'lucide-react'
import { AdminCard, AdminEmptyState, AdminField, AdminSectionHeader, AdminToggle } from '../components/admin/AdminUI'
import { adminButtonClass, adminTextareaClass } from '../components/admin/adminStyles'
import { MaskedInput } from '../components/MaskedInput'
import { Button, Input, useConfirm, useToast } from '../components/ui'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { uploadToCloudinary } from '../services/cloudinary'
import { defaultSiteSettings, suggestedCategories, DEFAULT_CATEGORY_IMAGE, type SiteCategory, type SiteSettings } from '../types/settings'
import { cn } from '../utils/cn'

type TabId = 'identidade' | 'cores' | 'categorias' | 'promocoes' | 'home' | 'contato'

const tabs: { id: TabId; label: string; icon: typeof Palette }[] = [
  { id: 'identidade', label: 'Identidade', icon: Type },
  { id: 'cores', label: 'Cores', icon: Palette },
  { id: 'categorias', label: 'Categorias', icon: FolderTree },
  { id: 'promocoes', label: 'Frete e Pix', icon: Truck },
  { id: 'home', label: 'Home e textos', icon: Megaphone },
  { id: 'contato', label: 'Contato', icon: Phone },
]

const SEO_DESCRIPTION_IDEAL = 160

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

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(settings)

  const handleSave = async () => {
    try {
      setSaving(true)
      if (draft.free_shipping_threshold < 0) {
        throw new Error('Valor do frete grátis inválido')
      }
      if (draft.pix_discount_percent < 0 || draft.pix_discount_percent > 100) {
        throw new Error('Percentual Pix deve estar entre 0 e 100')
      }
      const cleanedCategories = draft.categories
        .map((category) => ({
          ...category,
          name: category.name.trim(),
          label: category.label.trim(),
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
          ? 'Configurações salvas — nenhuma categoria ativa na loja'
          : 'Configurações salvas — a loja já reflete as mudanças',
      )
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao salvar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    const ok = await confirm({
      title: 'Restaurar padrão',
      message: 'Restaurar todas as configurações para o padrão? Você ainda precisa salvar depois.',
      confirmLabel: 'Restaurar',
      tone: 'danger',
    })
    if (!ok) return
    setDraft(defaultSiteSettings)
    setFormKey((current) => current + 1)
  }

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="h-14 animate-pulse rounded-2xl border border-line bg-white lg:h-72" />
        <div className="h-96 animate-pulse rounded-2xl border border-line bg-white" />
      </div>
    )
  }

  return (
    <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
      <AdminCard padding="none" className="lg:sticky lg:top-[92px]">
        <nav
          aria-label="Seções das configurações"
          className="no-scrollbar flex gap-1 overflow-x-auto p-1.5 lg:flex-col lg:overflow-visible lg:p-2"
        >
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-10 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20',
                  active ? 'bg-brand-mint text-brand-hover' : 'text-ink-soft hover:bg-surface hover:text-ink',
                )}
              >
                <Icon size={17} className={active ? 'text-brand' : 'text-muted'} />
                {label}
              </button>
            )
          })}
        </nav>
      </AdminCard>

      <div className="grid min-w-0 gap-4">
        <AdminCard padding="lg">
          {tab === 'identidade' && (
            <div className="grid gap-8">
              <div>
                <AdminSectionHeader title="Identidade da loja" description="Nome, slogan, textos do rodapé e SEO básico." />
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminField label="Nome da loja">
                    <Input value={draft.store_name} onChange={(e) => update('store_name', e.target.value)} />
                  </AdminField>
                  <AdminField label="Nome curto">
                    <Input
                      value={draft.store_name_short}
                      onChange={(e) => update('store_name_short', e.target.value)}
                    />
                  </AdminField>
                  <AdminField label="Slogan (abaixo do nome)">
                    <Input
                      value={draft.store_tagline}
                      placeholder="Ex.: Varejo e Atacado"
                      onChange={(e) => update('store_tagline', e.target.value)}
                    />
                  </AdminField>
                  <AdminField label="Título SEO (aba do navegador)">
                    <Input
                      value={draft.meta_title}
                      placeholder="Ex.: A&E Total Mix | Tênis e Perfumes"
                      onChange={(e) => update('meta_title', e.target.value)}
                    />
                  </AdminField>
                  <AdminField
                    label="Descrição SEO"
                    className="md:col-span-2"
                    hint={`Aparece nos resultados de busca. Ideal: até ${SEO_DESCRIPTION_IDEAL} caracteres (${draft.meta_description.length}/${SEO_DESCRIPTION_IDEAL}).`}
                  >
                    <Input
                      value={draft.meta_description}
                      onChange={(e) => update('meta_description', e.target.value)}
                      placeholder="Ex.: Tênis e perfumes no varejo e no atacado, com envio para todo o Brasil."
                    />
                  </AdminField>
                  <AdminField label="Texto do rodapé" className="md:col-span-2">
                    <textarea
                      className={adminTextareaClass}
                      rows={3}
                      value={draft.footer_about}
                      onChange={(e) => update('footer_about', e.target.value)}
                    />
                  </AdminField>
                  <AdminField label="Selo de segurança (rodapé)">
                    <Input
                      value={draft.footer_secure_text}
                      onChange={(e) => update('footer_secure_text', e.target.value)}
                    />
                  </AdminField>
                </div>
              </div>

              <div className="border-t border-line pt-8">
                <AdminSectionHeader
                  title="Logo"
                  description="A logo é exibida com as cores originais, sobre fundo claro."
                />
                <div className="grid gap-2.5">
                  <AdminToggle
                    checked={draft.logo_enabled}
                    onChange={(checked) => update('logo_enabled', checked)}
                    label="Exibir logo (ícone ou imagem)"
                  />
                  <AdminToggle
                    checked={draft.logo_show_text}
                    onChange={(checked) => update('logo_show_text', checked)}
                    label="Exibir nome e slogan ao lado do logo"
                  />
                  <AdminToggle
                    checked={draft.logo_as_favicon !== false}
                    onChange={(checked) => update('logo_as_favicon', checked)}
                    label="Usar logo como ícone da aba do navegador (favicon)"
                  />
                </div>

                {draft.logo_enabled && (
                  <div className="mt-4 grid gap-4 rounded-xl border border-line bg-surface/60 p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                    <div className="grid h-28 place-items-center overflow-hidden rounded-xl border border-line bg-white p-3">
                      {draft.logo_url ? (
                        <img src={draft.logo_url} alt="Pré-visualização da logo" className="max-h-20 max-w-full object-contain" />
                      ) : (
                        <span className="text-center text-xs text-muted">Ícone padrão</span>
                      )}
                    </div>
                    <div className="grid content-start gap-3">
                      <AdminField label="URL da logo" optional>
                        <Input
                          value={draft.logo_url}
                          placeholder="Cole uma URL ou faça upload abaixo"
                          onChange={(e) => update('logo_url', e.target.value)}
                        />
                      </AdminField>
                      <div className="flex flex-wrap gap-2">
                        <label
                          className={adminButtonClass(
                            'secondary',
                            'sm',
                            uploadingLogo ? 'cursor-wait opacity-70' : 'cursor-pointer',
                          )}
                        >
                          {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
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
                                notify('Logo enviada — lembre de salvar as configurações')
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
                          <button
                            type="button"
                            className={adminButtonClass('ghost', 'sm')}
                            onClick={() => update('logo_url', '')}
                          >
                            Remover imagem
                          </button>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-muted">
                        Sem imagem, o site usa o ícone padrão. Ative &quot;ícone da aba do navegador&quot; para
                        mostrar a logo também na aba do navegador. Desligue &quot;Exibir logo&quot; para mostrar só o
                        texto no cabeçalho.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'cores' && (
            <div className="grid gap-6">
              <AdminSectionHeader
                title="Cores do site"
                description="Aplicadas em botões, links e destaques de toda a loja ao salvar. A logo mantém as cores originais."
                flush
              />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <ColorField
                  label="Cor principal"
                  value={draft.color_brand}
                  defaultValue={defaultSiteSettings.color_brand}
                  defaultName="azul"
                  onChange={(value) => update('color_brand', value)}
                />
                <ColorField
                  label="Cor ao passar o mouse"
                  value={draft.color_brand_hover}
                  defaultValue={defaultSiteSettings.color_brand_hover}
                  defaultName="azul escuro"
                  onChange={(value) => update('color_brand_hover', value)}
                />
                <ColorField
                  label="Cor dos textos (grafite)"
                  value={draft.color_ink}
                  defaultValue={defaultSiteSettings.color_ink}
                  defaultName="grafite"
                  onChange={(value) => update('color_ink', value)}
                />
                <ColorField
                  label="Cor de promoção"
                  value={draft.color_promo}
                  defaultValue={defaultSiteSettings.color_promo}
                  defaultName="azul"
                  onChange={(value) => update('color_promo', value)}
                />
              </div>

              <div className="rounded-xl border border-line bg-surface/60 p-4 sm:p-5">
                <p className="text-xs font-medium text-muted">Pré-visualização</p>
                <div className="mt-3 rounded-xl border border-line bg-white p-5">
                  <span
                    className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                    style={{ background: draft.color_promo }}
                  >
                    Promoção
                  </span>
                  <p className="mt-3 text-xl font-bold tracking-tight" style={{ color: draft.color_ink }}>
                    {draft.store_name_short || draft.store_name}
                  </p>
                  <p className="mt-1 text-sm text-muted">{draft.store_tagline}</p>
                  <p className="mt-3 text-sm font-semibold" style={{ color: draft.color_brand }}>
                    Link de exemplo
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className="inline-flex min-h-10 items-center rounded-xl px-5 text-sm font-semibold text-white"
                      style={{ background: draft.color_brand }}
                    >
                      Botão principal
                    </span>
                    <span
                      className="inline-flex min-h-10 items-center rounded-xl px-5 text-sm font-semibold text-white"
                      style={{ background: draft.color_brand_hover }}
                    >
                      Botão com o mouse em cima
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'categorias' && (
            <div className="grid gap-4">
              <AdminSectionHeader
                title="Categorias da loja"
                description="Só aparecem no menu, na home e no catálogo depois de salvas aqui. Sem categorias, a loja não mostra nenhuma."
                flush
                action={
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={adminButtonClass('secondary', 'sm')}
                      onClick={() => update('categories', suggestedCategories.map((c) => ({ ...c })))}
                    >
                      {draft.categories.length === 0 ? 'Usar sugestões' : 'Substituir por sugestões'}
                    </button>
                    <button
                      type="button"
                      className={adminButtonClass('primary', 'sm')}
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
                    </button>
                  </div>
                }
              />

              {draft.categories.length === 0 ? (
                <AdminEmptyState
                  icon={<FolderTree size={20} />}
                  title="Nenhuma categoria cadastrada"
                  description="Adicione manualmente ou use as sugestões (Tênis, Perfumes...) e salve."
                />
              ) : (
                <div className="grid gap-3">
                  {draft.categories.map((category, index) => (
                    <CategoryEditor
                      key={index}
                      index={index}
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
            <div className="grid gap-8">
              <div>
                <AdminSectionHeader title="Barra superior" description="Faixa fina de aviso no topo da loja." />
                <div className="grid gap-3">
                  <AdminToggle
                    checked={draft.topbar_enabled}
                    onChange={(checked) => update('topbar_enabled', checked)}
                    label="Exibir barra superior"
                  />
                  <AdminField label="Texto da barra">
                    <Input value={draft.topbar_text} onChange={(e) => update('topbar_text', e.target.value)} />
                  </AdminField>
                </div>
              </div>

              <div className="border-t border-line pt-8">
                <AdminSectionHeader
                  title="Frete grátis"
                  description="Controle real no checkout e textos exibidos na loja."
                />
                <div className="grid gap-3">
                  <AdminToggle
                    checked={draft.free_shipping_enabled}
                    onChange={(checked) => update('free_shipping_enabled', checked)}
                    label="Ativar frete grátis"
                    description="Quando o subtotal atingir o valor mínimo, as opções de frete ficam R$ 0,00 no checkout."
                  />
                  <div className="grid gap-4 md:grid-cols-2" key={`fs-${formKey}`}>
                    <AdminField label="Valor mínimo do pedido">
                      <MaskedInput
                        name="free_shipping_threshold"
                        mask="currency"
                        defaultValue={draft.free_shipping_threshold}
                        onValueChange={(value) => update('free_shipping_threshold', value)}
                      />
                    </AdminField>
                    <AdminField label="Nome da oferta">
                      <Input
                        value={draft.free_shipping_label}
                        onChange={(e) => update('free_shipping_label', e.target.value)}
                      />
                    </AdminField>
                  </div>
                </div>
              </div>

              <div className="border-t border-line pt-8">
                <AdminSectionHeader title="Desconto no Pix" description="Desconto à vista aplicado no checkout." />
                <div className="grid gap-3">
                  <AdminToggle
                    checked={draft.pix_discount_enabled}
                    onChange={(checked) => update('pix_discount_enabled', checked)}
                    label="Ativar desconto no Pix"
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <AdminField label="Percentual (%)">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={draft.pix_discount_percent}
                        onChange={(e) => update('pix_discount_percent', Number(e.target.value) || 0)}
                      />
                    </AdminField>
                    <AdminField label="Texto das parcelas">
                      <Input
                        value={draft.installments_text}
                        onChange={(e) => update('installments_text', e.target.value)}
                      />
                    </AdminField>
                  </div>
                </div>
              </div>

              <div className="border-t border-line pt-8">
                <AdminSectionHeader title="Banner promocional" description="Faixa extra opcional na home." />
                <div className="grid gap-3">
                  <AdminToggle
                    checked={draft.promo_banner_enabled}
                    onChange={(checked) => update('promo_banner_enabled', checked)}
                    label="Exibir banner de promoção"
                  />
                  <AdminField label="Texto do banner">
                    <Input
                      value={draft.promo_banner_text}
                      onChange={(e) => update('promo_banner_text', e.target.value)}
                    />
                  </AdminField>
                </div>
              </div>
            </div>
          )}

          {tab === 'home' && (
            <div className="grid gap-8">
              <div>
                <AdminSectionHeader title="Banner principal da home" description="Primeira dobra do site." />
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminField label="Texto pequeno acima do título">
                    <Input value={draft.hero_eyebrow} onChange={(e) => update('hero_eyebrow', e.target.value)} />
                  </AdminField>
                  <AdminField label="Texto do botão">
                    <Input value={draft.hero_cta_label} onChange={(e) => update('hero_cta_label', e.target.value)} />
                  </AdminField>
                  <AdminField label="Título (linha 1)" className="md:col-span-2">
                    <Input value={draft.hero_title} onChange={(e) => update('hero_title', e.target.value)} />
                  </AdminField>
                  <AdminField label="Título em destaque (linha 2)" className="md:col-span-2">
                    <Input
                      value={draft.hero_title_highlight}
                      onChange={(e) => update('hero_title_highlight', e.target.value)}
                    />
                  </AdminField>
                  <AdminField label="Subtítulo" className="md:col-span-2">
                    <textarea
                      className={adminTextareaClass}
                      rows={3}
                      value={draft.hero_subtitle}
                      onChange={(e) => update('hero_subtitle', e.target.value)}
                    />
                  </AdminField>
                  <AdminField
                    label="URL da imagem do banner"
                    className="md:col-span-2"
                    hint="Prefira fotos de produtos em fundo claro ou bege."
                  >
                    <Input
                      value={draft.hero_image_url}
                      onChange={(e) => update('hero_image_url', e.target.value)}
                    />
                  </AdminField>
                  {draft.hero_image_url?.trim() && (
                    <div className="md:col-span-2">
                      <div className="aspect-[16/9] w-full max-w-sm overflow-hidden rounded-xl border border-line bg-sand-soft">
                        <img
                          src={draft.hero_image_url}
                          alt="Pré-visualização da imagem do banner"
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-line pt-8">
                <AdminSectionHeader title="Faixa de benefícios" description="Pix, frete e cartão." />
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminField label="Pix – título">
                    <Input
                      value={draft.benefit_pix_title}
                      onChange={(e) => update('benefit_pix_title', e.target.value)}
                    />
                  </AdminField>
                  <AdminField label="Pix – texto">
                    <Input
                      value={draft.benefit_pix_text}
                      onChange={(e) => update('benefit_pix_text', e.target.value)}
                    />
                  </AdminField>
                  <AdminField label="Frete – título">
                    <Input
                      value={draft.benefit_shipping_title}
                      onChange={(e) => update('benefit_shipping_title', e.target.value)}
                    />
                  </AdminField>
                  <AdminField label="Frete – texto">
                    <Input
                      value={draft.benefit_shipping_text}
                      onChange={(e) => update('benefit_shipping_text', e.target.value)}
                    />
                  </AdminField>
                  <AdminField label="Cartão – título">
                    <Input
                      value={draft.benefit_card_title}
                      onChange={(e) => update('benefit_card_title', e.target.value)}
                    />
                  </AdminField>
                  <AdminField label="Cartão – texto">
                    <Input
                      value={draft.benefit_card_text}
                      onChange={(e) => update('benefit_card_text', e.target.value)}
                    />
                  </AdminField>
                </div>
              </div>

              <div className="border-t border-line pt-8">
                <AdminSectionHeader title="Faixa de confiança" description="4 itens abaixo do banner principal." />
                <div className="grid gap-4 md:grid-cols-2">
                  {(
                    [
                      ['trust_1_title', 'trust_1_text', 'Item 1'],
                      ['trust_2_title', 'trust_2_text', 'Item 2'],
                      ['trust_3_title', 'trust_3_text', 'Item 3'],
                      ['trust_4_title', 'trust_4_text', 'Item 4'],
                    ] as const
                  ).map(([titleKey, textKey, label]) => (
                    <div key={titleKey} className="grid gap-2 rounded-xl border border-line bg-surface/60 p-4">
                      <p className="text-sm font-semibold text-ink">{label}</p>
                      <Input
                        aria-label={`${label} – título`}
                        value={draft[titleKey]}
                        onChange={(e) => update(titleKey, e.target.value)}
                      />
                      <Input
                        aria-label={`${label} – texto`}
                        value={draft[textKey]}
                        onChange={(e) => update(textKey, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-line pt-8">
                <AdminSectionHeader title="Newsletter" description="Bloco de cadastro de e-mail." />
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminField label="Título">
                    <Input
                      value={draft.newsletter_title}
                      onChange={(e) => update('newsletter_title', e.target.value)}
                    />
                  </AdminField>
                  <AdminField label="Subtítulo">
                    <Input
                      value={draft.newsletter_subtitle}
                      onChange={(e) => update('newsletter_subtitle', e.target.value)}
                    />
                  </AdminField>
                </div>
              </div>
            </div>
          )}

          {tab === 'contato' && (
            <div className="grid gap-4">
              <AdminSectionHeader
                title="Atendimento"
                description="WhatsApp e e-mail exibidos na loja."
                flush
              />
              <AdminToggle
                checked={draft.whatsapp_button_enabled}
                onChange={(checked) => update('whatsapp_button_enabled', checked)}
                label="Exibir botão flutuante do WhatsApp"
                description="O botão verde fica fixo no canto da loja. Desligue se não quiser exibir."
              />
              <div className="grid gap-4 md:grid-cols-2">
                <AdminField label="WhatsApp (somente números, com DDI)">
                  <Input
                    value={draft.whatsapp_number}
                    inputMode="numeric"
                    onChange={(e) => update('whatsapp_number', e.target.value.replace(/\D/g, ''))}
                    placeholder="5511999999999"
                  />
                </AdminField>
                <AdminField label="E-mail de contato" hint="Também recebe o aviso de novos pedidos.">
                  <Input
                    type="email"
                    value={draft.support_email}
                    onChange={(e) => update('support_email', e.target.value)}
                  />
                </AdminField>
                <AdminField label="Mensagem padrão do WhatsApp" className="md:col-span-2">
                  <Input
                    value={draft.whatsapp_message}
                    onChange={(e) => update('whatsapp_message', e.target.value)}
                  />
                </AdminField>
              </div>
            </div>
          )}
        </AdminCard>

        <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-soft backdrop-blur">
          <p className="mr-auto hidden items-center gap-2 text-sm sm:flex">
            {hasChanges ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
                <span className="font-medium text-ink">Alterações não salvas</span>
              </>
            ) : (
              <span className="text-muted">As mudanças aparecem na loja logo após salvar.</span>
            )}
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              onClick={handleReset}
              className={adminButtonClass('secondary', 'md', 'flex-1 sm:flex-none')}
            >
              <RotateCcw size={16} />
              Restaurar padrão
            </button>
            <Button type="button" onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none">
              <Save size={16} />
              {saving ? 'Salvando...' : 'Salvar configurações'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CategoryEditor({
  index,
  category,
  onChange,
  onRemove,
}: {
  index: number
  category: SiteCategory
  onChange: (category: SiteCategory) => void
  onRemove: () => void
}) {
  const { notify } = useToast()
  const [uploading, setUploading] = useState(false)

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface/60 px-4 py-2">
        <p className="min-w-0 truncate text-sm font-semibold text-ink">
          {category.name.trim() || `Nova categoria ${index + 1}`}
        </p>
        <button
          type="button"
          className={adminButtonClass('danger', 'sm')}
          onClick={onRemove}
          aria-label={`Remover categoria ${category.name || index + 1}`}
        >
          <Trash2 size={15} />
          <span className="hidden sm:inline">Remover</span>
        </button>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[104px_minmax(0,1fr)]">
        <div className="w-24 sm:w-full">
          <div className="aspect-[4/5] overflow-hidden rounded-lg border border-line bg-sand-soft">
            {category.image ? (
              <img src={category.image} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center px-2 text-center text-xs text-muted">Sem imagem</div>
            )}
          </div>
        </div>
        <div className="grid min-w-0 content-start gap-3 sm:grid-cols-2">
          <AdminField label="Nome da categoria" hint="Usado nos produtos e nos filtros.">
            <Input
              value={category.name}
              placeholder="Ex.: Tênis"
              onChange={(e) => onChange({ ...category, name: e.target.value })}
            />
          </AdminField>
          <AdminField label="Nome no menu">
            <Input
              value={category.label}
              placeholder="Ex.: Tênis"
              onChange={(e) => onChange({ ...category, label: e.target.value })}
            />
          </AdminField>
          <AdminField label="URL da imagem" className="sm:col-span-2">
            <Input
              value={category.image}
              placeholder="Cole uma URL ou faça upload abaixo"
              onChange={(e) => onChange({ ...category, image: e.target.value })}
            />
          </AdminField>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <label
              className={adminButtonClass('secondary', 'sm', uploading ? 'cursor-wait opacity-70' : 'cursor-pointer')}
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
                    notify('Imagem enviada — lembre de salvar as configurações')
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
              <button
                type="button"
                className={adminButtonClass('ghost', 'sm')}
                disabled={uploading}
                onClick={() => onChange({ ...category, image: '' })}
              >
                Remover imagem
              </button>
            )}
          </div>
          <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm font-medium text-ink sm:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer accent-brand"
              checked={category.show_in_nav}
              onChange={(e) => onChange({ ...category, show_in_nav: e.target.checked })}
            />
            Mostrar no menu superior
          </label>
        </div>
      </div>
    </div>
  )
}

function ColorField({
  label,
  value,
  defaultValue,
  defaultName,
  onChange,
}: {
  label: string
  value: string
  defaultValue: string
  defaultName: string
  onChange: (value: string) => void
}) {
  const isDefault = value?.toLowerCase() === defaultValue.toLowerCase()
  return (
    <AdminField
      as="div"
      label={label}
      hint={
        <span className="flex flex-wrap items-center gap-x-2">
          Padrão: {defaultValue.toUpperCase()} ({defaultName})
          {!isDefault && (
            <button
              type="button"
              className="font-semibold text-brand transition hover:text-brand-hover"
              onClick={() => onChange(defaultValue)}
            >
              Usar padrão
            </button>
          )}
        </span>
      }
    >
      <div className="flex items-center gap-2 rounded-xl border border-line bg-white p-1.5 transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15">
        <input
          type="color"
          aria-label={`${label} — seletor`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0"
        />
        <input
          aria-label={`${label} — código hexadecimal`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 bg-transparent px-1 py-1.5 font-mono text-sm uppercase text-ink outline-none"
        />
      </div>
    </AdminField>
  )
}
