import { getSupabaseAdmin } from './supabaseAdmin'

type NotificationType =
  | 'pedido_recebido'
  | 'pagamento_aprovado'
  | 'codigo_rastreio'
  | 'pedido_cancelado'

type Relation<T> = T | T[] | null

type ProductImage = {
  url?: string | null
  ordem?: number | null
}

type OrderItem = {
  quantidade: number
  preco_unitario: number
  sabor_nome?: string | null
  produtos: Relation<{
    nome?: string | null
    imagens_produtos?: ProductImage[] | null
  }>
}

type OrderEmailData = {
  id: string
  total: number
  frete: number
  frete_servico: string | null
  frete_prazo_dias: number | null
  codigo_rastreio: string | null
  url_rastreio: string | null
  endereco_snapshot: Record<string, unknown> | null
  usuarios: Relation<{ nome?: string | null; email?: string | null }>
  itens_pedido: OrderItem[] | null
}

type EmailBranding = {
  store_name?: string
  store_tagline?: string
  logo_enabled?: boolean
  logo_url?: string
  logo_show_text?: boolean
  support_email?: string
  color_brand?: string
  color_ink?: string
}

type EmailResult = {
  ok: boolean
  skipped?: boolean
  message?: string
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

function firstRelation<T>(relation: Relation<T>) {
  return Array.isArray(relation) ? relation[0] : relation
}

function safeColor(value: string | undefined, fallback: string) {
  return value && /^#[\da-f]{6}$/i.test(value) ? value : fallback
}

const DEFAULT_STORE_NAME = 'A&E Total Mix'
const DEFAULT_STORE_TAGLINE = 'Varejo e Atacado'
const DEFAULT_LOGO_URL = '/aee-wordmark.webp'
const DEFAULT_BRAND_COLOR = '#0066FF'
const DEFAULT_INK_COLOR = '#101828'
const MUTED_COLOR = '#667085'
const SURFACE_COLOR = '#F2F3F6'
const LINE_COLOR = '#E4E7EC'

/** Cores da identidade anterior (verde-limao/preto) que ainda podem estar salvas no banco. */
const legacyBrandColors = new Set(['#c4f000', '#b2dd00'])
const legacyInkColors = new Set(['#0d0f12', '#171717'])
const legacyStoreName = /passari[nm]|suplement/i
const legacyLogos = new Set(['/passarin-logo.png'])

/** Cor principal dos e-mails: usa a configurada no admin, trocando o antigo verde-limao pelo azul atual. */
function brandColor(value: string | undefined) {
  const color = safeColor(value, DEFAULT_BRAND_COLOR)
  return legacyBrandColors.has(color.toLowerCase()) ? DEFAULT_BRAND_COLOR : color
}

function inkColor(value: string | undefined) {
  const color = safeColor(value, DEFAULT_INK_COLOR)
  return legacyInkColors.has(color.toLowerCase()) ? DEFAULT_INK_COLOR : color
}

/** Nome, slogan e logo da loja, ignorando valores salvos da identidade anterior. */
function storeIdentity(branding: EmailBranding) {
  const rawName = branding.store_name?.trim() ?? ''
  const legacy = legacyStoreName.test(rawName)
  const name = !rawName || legacy ? DEFAULT_STORE_NAME : rawName
  const rawTagline = branding.store_tagline?.trim() ?? ''
  const tagline = legacy || /suplement/i.test(rawTagline) ? DEFAULT_STORE_TAGLINE : rawTagline
  const rawLogo = branding.logo_url?.trim() ?? ''
  const logo =
    branding.logo_enabled === false
      ? ''
      : legacy || !rawLogo || legacyLogos.has(rawLogo)
        ? DEFAULT_LOGO_URL
        : rawLogo
  return { name, tagline, logo, showText: !legacy && branding.logo_show_text === true }
}

function absoluteUrl(value: string | null | undefined) {
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  const appUrl = process.env.APP_URL?.replace(/\/+$/, '')
  return appUrl ? `${appUrl}/${value.replace(/^\/+/, '')}` : null
}

function productRows(items: OrderItem[], ink: string) {
  return items
    .map((item) => {
      const product = firstRelation(item.produtos)
      const image = [...(product?.imagens_produtos ?? [])].sort(
        (left, right) => Number(left.ordem ?? 0) - Number(right.ordem ?? 0),
      )[0]
      const imageUrl = absoluteUrl(image?.url)
      const flavor = item.sabor_nome
        ? `<div style="margin-top:3px;color:${MUTED_COLOR};font-size:13px">Variação: ${escapeHtml(item.sabor_nome)}</div>`
        : ''
      return `<tr>
        <td style="padding:12px 0;border-bottom:1px solid ${LINE_COLOR};width:64px;vertical-align:middle">
          ${
            imageUrl
              ? `<img src="${escapeHtml(imageUrl)}" width="52" height="52" alt="" style="display:block;width:52px;height:52px;object-fit:cover;border-radius:12px;background:${SURFACE_COLOR}">`
              : `<div style="width:52px;height:52px;border-radius:12px;background:${SURFACE_COLOR}"></div>`
          }
        </td>
        <td style="padding:12px 8px;border-bottom:1px solid ${LINE_COLOR};vertical-align:middle">
          <div style="font-size:15px;font-weight:700;color:${ink}">${escapeHtml(product?.nome ?? 'Produto')}</div>
          ${flavor}
          <div style="margin-top:3px;color:${MUTED_COLOR};font-size:13px">Quantidade: ${item.quantidade}</div>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid ${LINE_COLOR};text-align:right;vertical-align:middle;white-space:nowrap;font-size:14px;font-weight:700;color:${ink}">
          ${escapeHtml(formatCurrency(Number(item.preco_unitario) * item.quantidade))}
        </td>
      </tr>`
    })
    .join('')
}

function emailTemplate({
  title,
  preview,
  content,
  branding,
}: {
  title: string
  preview: string
  content: string
  branding: EmailBranding
}) {
  const identity = storeIdentity(branding)
  const storeName = escapeHtml(identity.name)
  const tagline = identity.tagline ? escapeHtml(identity.tagline) : ''
  const brand = brandColor(branding.color_brand)
  const ink = inkColor(branding.color_ink)
  const logoUrl = identity.logo ? absoluteUrl(identity.logo) : null
  const support = branding.support_email?.trim()
  const header = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${storeName}" style="display:block;max-width:200px;max-height:72px;height:auto;margin:0 auto;border:0">
       ${identity.showText ? `<div style="margin-top:8px;font-size:16px;font-weight:700;color:${ink}">${storeName}</div>` : ''}`
    : `<div style="font-size:20px;font-weight:700;color:${ink}">${storeName}</div>
       ${tagline ? `<div style="margin-top:4px;font-size:12px;color:${MUTED_COLOR}">${tagline}</div>` : ''}`

  return `<!doctype html>
<html lang="pt-BR">
  <head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:${SURFACE_COLOR};font-family:Arial,Helvetica,sans-serif;color:${ink}">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${SURFACE_COLOR}">
      <tr><td align="center" style="padding:28px 12px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px">
          <tr><td align="center" style="padding:22px 24px;background:#ffffff;border:1px solid ${LINE_COLOR};border-bottom:4px solid ${brand};border-radius:16px 16px 0 0">
            ${header}
          </td></tr>
          <tr><td style="background:#ffffff;padding:34px 30px;border-left:1px solid ${LINE_COLOR};border-right:1px solid ${LINE_COLOR}">
            <h1 style="margin:0 0 20px;font-size:26px;line-height:1.25;color:${ink}">${escapeHtml(title)}</h1>
            ${content}
          </td></tr>
          <tr><td align="center" style="padding:20px 24px;background:#ffffff;border:1px solid ${LINE_COLOR};border-radius:0 0 16px 16px">
            <div style="font-size:13px;font-weight:700;color:${ink}">${storeName}</div>
            ${
              support
                ? `<div style="margin-top:6px;font-size:12px;color:${MUTED_COLOR}">Atendimento: <a href="mailto:${escapeHtml(support)}" style="color:${brand};text-decoration:none">${escapeHtml(support)}</a></div>`
                : ''
            }
            <div style="margin-top:6px;font-size:11px;color:${MUTED_COLOR}">Esta é uma mensagem automática da loja.</div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

/** Remove aspas acidentais coladas no painel da Vercel / .env. */
const cleanEnv = (value: string | undefined) => value?.trim().replace(/^["']|["']$/g, '') ?? ''

async function deliverEmail(to: string, subject: string, html: string) {
  const apiKey = cleanEnv(process.env.RESEND_API_KEY)
  const from = cleanEnv(process.env.EMAIL_FROM)
  if (!apiKey || !from) throw new Error('Configure RESEND_API_KEY e EMAIL_FROM')

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })
  const payload = (await resendResponse.json().catch(() => null)) as { id?: string; message?: string } | null
  if (!resendResponse.ok) {
    const message = payload?.message ?? `Resend respondeu ${resendResponse.status}`
    console.error('[email] Resend rejeitou envio', { to, subject, status: resendResponse.status, message })
    throw new Error(message)
  }
  return payload?.id ?? null
}

async function loadBranding() {
  const { data } = await getSupabaseAdmin().from('site_settings').select('config').eq('id', 1).maybeSingle()
  return (((data as { config?: EmailBranding } | null)?.config ?? {}) as EmailBranding)
}

async function claimOrderEmailNotification(
  pedidoId: string,
  tipo: NotificationType | 'novo_pedido_admin',
  destinatario: string,
) {
  const supabase = getSupabaseAdmin()
  const { data: claim, error: claimError } = await supabase
    .from('email_notificacoes')
    .insert({ pedido_id: pedidoId, tipo, destinatario })
    .select('id')
    .single()

  if (!claimError && claim) return { claim, legacy: false as const }

  // Já existe registro: se o envio anterior falhou no meio, tenta de novo.
  if (claimError?.code === '23505') {
    const { data: existing } = await supabase
      .from('email_notificacoes')
      .select('id, resend_id, enviado_em')
      .eq('pedido_id', pedidoId)
      .eq('tipo', tipo)
      .maybeSingle()

    if (existing?.enviado_em || existing?.resend_id) {
      return { skipped: true as const }
    }
    if (existing?.id) return { claim: { id: existing.id }, legacy: false as const }
    return { skipped: true as const }
  }

  // Bancos sem o tipo novo no CHECK: envia sem gravar o claim.
  if (claimError?.code === '23514') {
    return { claim: null, legacy: true as const }
  }

  return {
    error: claimError?.message ?? 'Não foi possível registrar o envio do e-mail',
  }
}

async function sendOrderEmail(orderId: string, type: NotificationType): Promise<EmailResult> {
  const apiKey = cleanEnv(process.env.RESEND_API_KEY)
  const from = cleanEnv(process.env.EMAIL_FROM)
  if (!apiKey || !from) {
    return { ok: false, message: 'Configure RESEND_API_KEY e EMAIL_FROM' }
  }

  const supabase = getSupabaseAdmin()
  const [{ data, error }, { data: settingsRow }] = await Promise.all([
    supabase
      .from('pedidos')
      .select(
        'id, total, frete, frete_servico, frete_prazo_dias, codigo_rastreio, url_rastreio, endereco_snapshot, usuarios(nome, email), itens_pedido(quantidade, preco_unitario, sabor_nome, produtos(nome, imagens_produtos(url, ordem)))',
      )
      .eq('id', orderId)
      .single(),
    supabase.from('site_settings').select('config').eq('id', 1).maybeSingle(),
  ])

  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Pedido não encontrado para envio do e-mail' }
  }

  const order = data as unknown as OrderEmailData
  const branding = ((settingsRow as { config?: EmailBranding } | null)?.config ?? {}) as EmailBranding
  const user = firstRelation(order.usuarios)
  const recipient = user?.email?.trim()
  if (!recipient) return { ok: false, message: 'Cliente sem e-mail cadastrado' }
  if (type === 'codigo_rastreio' && !order.codigo_rastreio) {
    return { ok: false, message: 'Pedido ainda não possui código de rastreio' }
  }

  const claimResult = await claimOrderEmailNotification(order.id, type, recipient)
  if ('skipped' in claimResult && claimResult.skipped) return { ok: true, skipped: true }
  if ('error' in claimResult && claimResult.error) {
    return { ok: false, message: claimResult.error }
  }
  const claim = 'claim' in claimResult ? claimResult.claim : null

  const firstName = escapeHtml(user?.nome?.trim().split(/\s+/)[0] || 'cliente')
  const shortOrderId = escapeHtml(order.id.slice(0, 8).toUpperCase())
  const ink = inkColor(branding.color_ink)
  const brand = brandColor(branding.color_brand)
  const items = order.itens_pedido ?? []
  const rows = productRows(items, ink)
  const ordersUrl = absoluteUrl('/minha-conta/pedidos')
  const address = order.endereco_snapshot ?? {}
  const street = [address.rua, address.numero, address.complemento].filter(Boolean).join(', ')
  const city = [address.bairro, address.cidade, address.estado].filter(Boolean).join(' - ')
  const postalCode = String(address.cep ?? '').replace(/^(\d{5})(\d{3})$/, '$1-$2')
  const addressHtml =
    street || city
      ? `<div style="margin-top:24px;padding:18px;border-radius:14px;background:${SURFACE_COLOR}">
          <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:${MUTED_COLOR}">Endereço de entrega</div>
          <div style="margin-top:8px;font-size:14px;line-height:1.55;color:${ink}">
            ${escapeHtml(street)}${street && city ? '<br>' : ''}${escapeHtml(city)}
            ${postalCode ? `<br>CEP ${escapeHtml(postalCode)}` : ''}
          </div>
        </div>`
      : ''
  const productsHtml = rows
    ? `<div style="margin-top:26px">
        <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:${MUTED_COLOR}">Resumo do pedido</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px">${rows}</table>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px">
          ${
            Number(order.frete) > 0
              ? `<tr><td style="padding:4px 0;color:${MUTED_COLOR};font-size:14px">Frete</td><td align="right" style="padding:4px 0;font-size:14px">${escapeHtml(formatCurrency(Number(order.frete)))}</td></tr>`
              : ''
          }
          <tr><td style="padding:8px 0 0;font-size:17px;font-weight:800;color:${ink}">${
            type === 'pagamento_aprovado' ? 'Total pago' : 'Total do pedido'
          }</td><td align="right" style="padding:8px 0 0;font-size:17px;font-weight:800;color:${ink}">${escapeHtml(formatCurrency(Number(order.total)))}</td></tr>
        </table>
      </div>`
    : ''
  const ordersButton = ordersUrl
    ? `<div style="margin-top:28px">
        <a href="${escapeHtml(ordersUrl)}" style="display:inline-block;padding:14px 24px;border-radius:12px;background:${brand};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">Ver meus pedidos</a>
      </div>`
    : ''
  const subject =
    type === 'pedido_recebido'
      ? `Pedido recebido - #${shortOrderId}`
      : type === 'pagamento_aprovado'
        ? `Pagamento confirmado - pedido #${shortOrderId}`
        : type === 'codigo_rastreio'
          ? `Seu pedido foi enviado - rastreio #${shortOrderId}`
          : `Pedido cancelado - #${shortOrderId}`
  const html =
    type === 'pedido_recebido'
      ? emailTemplate({
          title: 'Recebemos o seu pedido!',
          preview: `O pedido #${shortOrderId} foi registrado e aguarda o pagamento.`,
          branding,
          content: `<p style="margin:0;font-size:16px;line-height:1.65">Olá, ${firstName}.</p>
            <div style="margin:20px 0;padding:16px 18px;border-left:4px solid ${brand};border-radius:0 12px 12px 0;background:${SURFACE_COLOR}">
              <div style="font-size:13px;color:${MUTED_COLOR}">Pedido #${shortOrderId}</div>
              <div style="margin-top:5px;font-size:16px;font-weight:800;color:${ink}">Pedido registrado · Aguardando pagamento</div>
            </div>
            <p style="margin:0;font-size:16px;line-height:1.65">
              Seu pedido foi criado com sucesso. Assim que o pagamento for confirmado,
              começamos a preparar o envio e você recebe outro e-mail de confirmação.
            </p>
            ${productsHtml}
            ${addressHtml}
            ${ordersButton}`,
        })
      : type === 'pagamento_aprovado'
        ? emailTemplate({
            title: 'Pagamento confirmado!',
            preview: `Recebemos o pagamento do pedido #${shortOrderId}.`,
            branding,
            content: `<p style="margin:0;font-size:16px;line-height:1.65">Olá, ${firstName}.</p>
            <div style="margin:20px 0;padding:16px 18px;border-left:4px solid ${brand};border-radius:0 12px 12px 0;background:${SURFACE_COLOR}">
              <div style="font-size:13px;color:${MUTED_COLOR}">Pedido #${shortOrderId}</div>
              <div style="margin-top:5px;font-size:16px;font-weight:800;color:${ink}">Pagamento aprovado · Preparando para envio</div>
            </div>
            <p style="margin:0;font-size:16px;line-height:1.65">
              Seu pagamento foi recebido com sucesso. Já estamos preparando tudo com cuidado para o envio.
              Você receberá outro e-mail quando o código de rastreio estiver disponível.
            </p>
            ${productsHtml}
            ${addressHtml}
            ${ordersButton}`,
          })
        : type === 'codigo_rastreio'
          ? emailTemplate({
              title: 'Seu pedido foi enviado!',
              preview: `O código de rastreio do pedido #${shortOrderId} já está disponível.`,
              branding,
              content: `<p style="margin:0;font-size:16px;line-height:1.65">Olá, ${firstName}.</p>
            <p style="margin:14px 0 0;font-size:16px;line-height:1.65">
              Boa notícia: o pedido <strong>#${shortOrderId}</strong> já está a caminho.
            </p>
            <div style="margin:24px 0;padding:22px;border-radius:16px;background:${SURFACE_COLOR};text-align:center">
              <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:${MUTED_COLOR}">Código de rastreio</div>
              <div style="margin-top:10px;font-size:23px;font-weight:800;letter-spacing:.08em;color:${ink}">
                ${escapeHtml(order.codigo_rastreio ?? '')}
              </div>
              ${
                order.url_rastreio
                  ? `<a href="${escapeHtml(order.url_rastreio)}" style="display:inline-block;margin-top:18px;padding:14px 24px;border-radius:12px;background:${brand};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">Acompanhar entrega</a>`
                  : ''
              }
            </div>
            ${
              order.frete_servico || order.frete_prazo_dias
                ? `<p style="margin:0;color:${MUTED_COLOR};font-size:14px;line-height:1.55">
                    Envio${order.frete_servico ? ` por ${escapeHtml(order.frete_servico)}` : ''}${order.frete_prazo_dias ? ` · Prazo estimado de ${order.frete_prazo_dias} dias úteis após a postagem` : ''}.
                  </p>`
                : ''
            }
            ${ordersButton}`,
            })
          : emailTemplate({
              title: 'Pedido cancelado',
              preview: `O pedido #${shortOrderId} foi cancelado.`,
              branding,
              content: `<p style="margin:0;font-size:16px;line-height:1.65">Olá, ${firstName}.</p>
              <div style="margin:20px 0;padding:16px 18px;border-left:4px solid #D92D20;border-radius:0 12px 12px 0;background:#FEF3F2">
                <div style="font-size:13px;color:${MUTED_COLOR}">Pedido #${shortOrderId}</div>
                <div style="margin-top:5px;font-size:16px;font-weight:800;color:#B42318">Pedido cancelado</div>
              </div>
              <p style="margin:0;font-size:16px;line-height:1.65">
                Confirmamos o cancelamento do seu pedido. Caso o pagamento já tenha sido aprovado,
                a devolução do valor seguirá os prazos da forma de pagamento utilizada.
              </p>
              ${productsHtml}
              ${ordersButton}`,
            })

  try {
    const resendId = await deliverEmail(recipient, subject, html)
    if (claim) {
      await supabase
        .from('email_notificacoes')
        .update({ resend_id: resendId, enviado_em: new Date().toISOString() })
        .eq('id', claim.id)
    }
    return { ok: true }
  } catch (error) {
    if (claim) await supabase.from('email_notificacoes').delete().eq('id', claim.id)
    return { ok: false, message: error instanceof Error ? error.message : 'Erro ao enviar e-mail' }
  }
}

export const sendOrderReceivedEmail = (orderId: string) => sendOrderEmail(orderId, 'pedido_recebido')
export const sendPaymentApprovedEmail = (orderId: string) => sendOrderEmail(orderId, 'pagamento_aprovado')
export const sendTrackingCodeEmail = (orderId: string) => sendOrderEmail(orderId, 'codigo_rastreio')
export const sendOrderCancelledEmail = (orderId: string) => sendOrderEmail(orderId, 'pedido_cancelado')

/** Avisa o e-mail de contato do admin (support_email) sobre um novo pedido. */
export async function sendNewOrderAdminEmail(orderId: string): Promise<EmailResult> {
  const apiKey = cleanEnv(process.env.RESEND_API_KEY)
  const from = cleanEnv(process.env.EMAIL_FROM)
  if (!apiKey || !from) {
    return { ok: false, message: 'Configure RESEND_API_KEY e EMAIL_FROM' }
  }

  const supabase = getSupabaseAdmin()
  const [{ data, error }, branding] = await Promise.all([
    supabase
      .from('pedidos')
      .select(
        'id, total, frete, frete_servico, frete_prazo_dias, codigo_rastreio, url_rastreio, endereco_snapshot, metodo_pagamento, status, usuarios(nome, email), itens_pedido(quantidade, preco_unitario, sabor_nome, produtos(nome, imagens_produtos(url, ordem)))',
      )
      .eq('id', orderId)
      .single(),
    loadBranding(),
  ])

  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Pedido não encontrado para avisar o admin' }
  }

  const order = data as unknown as OrderEmailData & {
    metodo_pagamento?: string | null
    status?: string | null
  }
  const recipient = branding.support_email?.trim()
  if (!recipient || !recipient.includes('@')) {
    return { ok: false, message: 'Cadastre o e-mail de contato em Configurações do admin' }
  }

  const claimResult = await claimOrderEmailNotification(order.id, 'novo_pedido_admin', recipient)
  if ('skipped' in claimResult && claimResult.skipped) return { ok: true, skipped: true }
  if ('error' in claimResult && claimResult.error) {
    return { ok: false, message: claimResult.error }
  }
  const claim = 'claim' in claimResult ? claimResult.claim : null

  const user = firstRelation(order.usuarios)
  const customerName = escapeHtml(user?.nome?.trim() || 'Cliente')
  const customerEmail = escapeHtml(user?.email?.trim() || '—')
  const shortOrderId = escapeHtml(order.id.slice(0, 8).toUpperCase())
  const ink = inkColor(branding.color_ink)
  const brand = brandColor(branding.color_brand)
  const items = order.itens_pedido ?? []
  const rows = productRows(items, ink)
  const adminOrdersUrl = absoluteUrl('/admin/pedidos')
  const paymentLabel =
    order.metodo_pagamento === 'pix'
      ? 'Pix'
      : order.metodo_pagamento === 'cartao'
        ? 'Cartão / boleto'
        : escapeHtml(order.metodo_pagamento ?? '—')
  const statusLabel = escapeHtml(order.status ?? 'pendente')

  const address = order.endereco_snapshot ?? {}
  const street = [address.rua, address.numero, address.complemento].filter(Boolean).join(', ')
  const city = [address.bairro, address.cidade, address.estado].filter(Boolean).join(' - ')
  const postalCode = String(address.cep ?? '').replace(/^(\d{5})(\d{3})$/, '$1-$2')

  const html = emailTemplate({
    title: 'Novo pedido na loja',
    preview: `Pedido #${shortOrderId} de ${user?.nome?.trim() || 'cliente'} · ${formatCurrency(Number(order.total))}`,
    branding,
    content: `<p style="margin:0;font-size:16px;line-height:1.65">
        Um cliente acabou de fazer um novo pedido na loja.
      </p>
      <div style="margin:20px 0;padding:16px 18px;border-left:4px solid ${brand};border-radius:0 12px 12px 0;background:${SURFACE_COLOR}">
        <div style="font-size:13px;color:${MUTED_COLOR}">Pedido #${shortOrderId}</div>
        <div style="margin-top:5px;font-size:16px;font-weight:800;color:${ink}">
          ${escapeHtml(formatCurrency(Number(order.total)))} · ${statusLabel}
        </div>
        <div style="margin-top:8px;font-size:14px;color:${MUTED_COLOR}">
          Cliente: <strong>${customerName}</strong> (${customerEmail})<br>
          Pagamento: ${paymentLabel}
        </div>
      </div>
      ${
        rows
          ? `<div style="margin-top:8px">
              <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:${MUTED_COLOR}">Itens</div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px">${rows}</table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px">
                ${
                  Number(order.frete) > 0
                    ? `<tr><td style="padding:4px 0;color:${MUTED_COLOR};font-size:14px">Frete</td><td align="right" style="padding:4px 0;font-size:14px">${escapeHtml(formatCurrency(Number(order.frete)))}</td></tr>`
                    : ''
                }
                <tr><td style="padding:8px 0 0;font-size:17px;font-weight:800;color:${ink}">Total</td><td align="right" style="padding:8px 0 0;font-size:17px;font-weight:800;color:${ink}">${escapeHtml(formatCurrency(Number(order.total)))}</td></tr>
              </table>
            </div>`
          : ''
      }
      ${
        street || city
          ? `<div style="margin-top:24px;padding:18px;border-radius:14px;background:${SURFACE_COLOR}">
              <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:${MUTED_COLOR}">Entrega</div>
              <div style="margin-top:8px;font-size:14px;line-height:1.55;color:${ink}">
                ${escapeHtml(street)}${street && city ? '<br>' : ''}${escapeHtml(city)}
                ${postalCode ? `<br>CEP ${escapeHtml(postalCode)}` : ''}
              </div>
            </div>`
          : ''
      }
      ${
        adminOrdersUrl
          ? `<div style="margin-top:28px">
              <a href="${escapeHtml(adminOrdersUrl)}" style="display:inline-block;padding:14px 24px;border-radius:12px;background:${brand};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">Abrir pedidos no admin</a>
            </div>`
          : ''
      }`,
  })

  try {
    const resendId = await deliverEmail(recipient, `Novo pedido #${shortOrderId}`, html)
    if (claim) {
      await supabase
        .from('email_notificacoes')
        .update({ resend_id: resendId, enviado_em: new Date().toISOString() })
        .eq('id', claim.id)
    }
    return { ok: true }
  } catch (sendError) {
    if (claim) await supabase.from('email_notificacoes').delete().eq('id', claim.id)
    return {
      ok: false,
      message: sendError instanceof Error ? sendError.message : 'Erro ao avisar o admin',
    }
  }
}

export async function sendWelcomeEmail(userId: string): Promise<EmailResult> {
  const supabase = getSupabaseAdmin()
  const [{ data: user, error }, branding] = await Promise.all([
    supabase.from('usuarios').select('id, nome, email').eq('id', userId).single(),
    loadBranding(),
  ])
  if (error || !user) return { ok: false, message: error?.message ?? 'Usuário não encontrado' }

  const { data: claim, error: claimError } = await supabase
    .from('user_email_notificacoes')
    .insert({ usuario_id: user.id, tipo: 'boas_vindas', destinatario: user.email })
    .select('id')
    .single()

  let welcomeClaim = claim
  if (claimError?.code === '23505') {
    const { data: existing } = await supabase
      .from('user_email_notificacoes')
      .select('id, resend_id, enviado_em')
      .eq('usuario_id', user.id)
      .eq('tipo', 'boas_vindas')
      .maybeSingle()
    if (existing?.enviado_em || existing?.resend_id) return { ok: true, skipped: true }
    if (!existing?.id) return { ok: true, skipped: true }
    welcomeClaim = { id: existing.id }
  } else if (claimError || !claim) {
    return { ok: false, message: claimError?.message ?? 'Erro ao registrar boas-vindas' }
  }

  const firstName = escapeHtml(String(user.nome).trim().split(/\s+/)[0] || 'cliente')
  const ink = inkColor(branding.color_ink)
  const brand = brandColor(branding.color_brand)
  const catalogUrl = absoluteUrl('/catalogo')
  const html = emailTemplate({
    title: `Bem-vindo, ${firstName}!`,
    preview: 'Sua conta foi criada com sucesso.',
    branding,
    content: `<p style="margin:0;font-size:16px;line-height:1.65">
        Sua conta foi criada com sucesso. Agora você pode comprar, salvar favoritos e acompanhar todos os seus pedidos em um só lugar.
      </p>
      <div style="margin:24px 0;padding:20px;border-radius:16px;background:${SURFACE_COLOR}">
        <div style="font-size:16px;font-weight:800;color:${ink}">Tudo pronto para começar</div>
        <div style="margin-top:7px;color:${MUTED_COLOR};font-size:14px;line-height:1.55">
          Aproveite para conhecer nossa seleção de tênis, perfumes e muito mais.
        </div>
      </div>
      ${
        catalogUrl
          ? `<a href="${escapeHtml(catalogUrl)}" style="display:inline-block;padding:14px 24px;border-radius:12px;background:${brand};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">Conhecer produtos</a>`
          : ''
      }`,
  })

  try {
    const resendId = await deliverEmail(user.email, 'Bem-vindo à A&E Total Mix!', html)
    await supabase
      .from('user_email_notificacoes')
      .update({ resend_id: resendId, enviado_em: new Date().toISOString() })
      .eq('id', welcomeClaim!.id)
    return { ok: true }
  } catch (sendError) {
    await supabase.from('user_email_notificacoes').delete().eq('id', welcomeClaim!.id)
    return { ok: false, message: sendError instanceof Error ? sendError.message : 'Erro ao enviar boas-vindas' }
  }
}

export async function sendPasswordResetCode(email: string, code: string, name?: string | null) {
  const branding = await loadBranding()
  const firstName = escapeHtml(name?.trim().split(/\s+/)[0] || 'cliente')
  const ink = inkColor(branding.color_ink)
  const brand = brandColor(branding.color_brand)
  const html = emailTemplate({
    title: 'Recupere sua senha',
    preview: `Seu código de recuperação é ${code}.`,
    branding,
    content: `<p style="margin:0;font-size:16px;line-height:1.65">Olá, ${firstName}.</p>
      <p style="margin:14px 0 0;font-size:16px;line-height:1.65">
        Use o código abaixo para criar uma nova senha. Ele expira em 15 minutos.
      </p>
      <div style="margin:24px 0;padding:22px;border:2px solid ${brand};border-radius:16px;background:${SURFACE_COLOR};text-align:center">
        <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:${MUTED_COLOR}">Código de recuperação</div>
        <div style="margin-top:10px;font-size:32px;font-weight:800;letter-spacing:.22em;color:${ink}">${escapeHtml(code)}</div>
      </div>
      <p style="margin:0;color:${MUTED_COLOR};font-size:13px;line-height:1.55">
        Se você não solicitou a troca de senha, ignore este e-mail. Sua conta continua segura.
      </p>`,
  })
  await deliverEmail(email, 'Código para recuperar sua senha', html)
}
