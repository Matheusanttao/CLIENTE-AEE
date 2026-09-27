import { ChevronRight, Mail, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { buildBreadcrumbJsonLd } from '../lib/seo'

type LegalSection = { title: string; paragraphs: string[] }

type LegalPageContent = {
  title: string
  path: string
  description: string
  intro: string
  sections: (context: { storeName: string; email: string }) => LegalSection[]
}

const pages = {
  privacidade: {
    title: 'Política de privacidade',
    path: '/privacidade',
    description:
      'Política de privacidade da A&E Total Mix: como coletamos, usamos e protegemos seus dados.',
    intro: 'Saiba como tratamos os seus dados pessoais ao usar a nossa loja online.',
    sections: ({ storeName, email }) => [
      {
        title: 'Dados que coletamos',
        paragraphs: [
          'Coletamos dados como nome, e-mail, endereço e histórico de compras para processar pedidos e melhorar sua experiência.',
        ],
      },
      {
        title: 'Pagamentos',
        paragraphs: [
          `Seus dados de pagamento são processados pelo Mercado Pago. A ${storeName} não armazena dados completos de cartão.`,
        ],
      },
      {
        title: 'Armazenamento e segurança',
        paragraphs: ['Utilizamos o Supabase para autenticação e armazenamento seguro das informações da conta.'],
      },
      {
        title: 'Seus direitos',
        paragraphs: [`Você pode solicitar acesso, correção ou exclusão dos seus dados pelo e-mail ${email}.`],
      },
      {
        title: 'Atualizações desta política',
        paragraphs: ['Esta política pode ser atualizada. Recomendamos revisá-la periodicamente.'],
      },
    ],
  },
  termos: {
    title: 'Termos de uso',
    path: '/termos',
    description: 'Termos de uso da A&E Total Mix: regras de compra, estoque, preços e uso da loja online.',
    intro: 'Estas são as regras para comprar e navegar na nossa loja online.',
    sections: ({ storeName }) => [
      {
        title: 'Aceitação dos termos',
        paragraphs: [
          `Ao utilizar a loja ${storeName}, você concorda com estes termos e com a nossa política de privacidade.`,
        ],
      },
      {
        title: 'Preços, estoque e pedidos',
        paragraphs: [
          'Os preços, promoções e estoque podem ser alterados sem aviso prévio enquanto o pedido não for confirmado.',
          'Pedidos ficam sujeitos à confirmação de pagamento e à disponibilidade de estoque.',
        ],
      },
      {
        title: 'Uso da loja',
        paragraphs: [
          'É proibido utilizar a loja para fins fraudulentos ou ilegais.',
          `A ${storeName} pode suspender contas em caso de uso indevido ou suspeita de fraude.`,
        ],
      },
    ],
  },
  trocas: {
    title: 'Trocas e devoluções',
    path: '/trocas-devolucoes',
    description:
      'Política de trocas e devoluções da A&E Total Mix, conforme o Código de Defesa do Consumidor.',
    intro: 'Veja como solicitar a troca ou a devolução de um produto comprado na loja online.',
    sections: ({ email }) => [
      {
        title: 'Prazo para solicitar',
        paragraphs: [
          'Você pode solicitar troca ou devolução em até 7 dias corridos após o recebimento, conforme o Código de Defesa do Consumidor.',
        ],
      },
      {
        title: 'Condições do produto',
        paragraphs: [
          'Os produtos devem estar lacrados, sem uso e com a embalagem original, salvo em caso de defeito de fabricação.',
        ],
      },
      {
        title: 'Como solicitar',
        paragraphs: [
          `Para iniciar uma troca ou devolução, entre em contato pelo e-mail ${email} informando o número do pedido.`,
          'Se você tem conta, também pode usar a opção “Pedir devolução” em Minha conta › Pedidos, disponível para pedidos entregues dentro desse prazo.',
        ],
      },
      {
        title: 'Reembolso',
        paragraphs: [
          'Os reembolsos seguem o mesmo meio de pagamento utilizado na compra, após a análise do produto devolvido.',
        ],
      },
      {
        title: 'Frete de devolução',
        paragraphs: [
          'O frete de devolução por arrependimento pode ser de responsabilidade do cliente, salvo quando o produto apresentar defeito.',
        ],
      },
    ],
  },
} satisfies Record<string, LegalPageContent>

type LegalType = keyof typeof pages

const legalOrder: LegalType[] = ['privacidade', 'termos', 'trocas']

export function LegalPage({ type }: { type: LegalType }) {
  const { settings, whatsappUrl } = useSiteSettings()
  const page = pages[type]
  const storeName = settings.store_name || 'A&E Total Mix'
  const email = settings.support_email?.trim() || 'o e-mail de atendimento da loja'
  const sections = page.sections({ storeName, email })
  const related = legalOrder.filter((key) => key !== type).map((key) => pages[key])
  const hasWhatsapp = Boolean(settings.whatsapp_number?.trim())

  return (
    <>
      <Seo
        title={`${page.title} | A&E Total Mix`}
        description={page.description}
        path={page.path}
        jsonLd={buildBreadcrumbJsonLd([
          { name: 'Início', path: '/' },
          { name: page.title, path: page.path },
        ])}
      />
      <section className="container max-w-3xl py-12 md:py-16">
        <nav aria-label="Você está em" className="flex items-center gap-1.5 text-sm text-muted">
          <Link to="/" className="transition-colors hover:text-brand">
            Início
          </Link>
          <ChevronRight size={14} className="shrink-0" />
          <span className="truncate font-medium text-ink">{page.title}</span>
        </nav>

        <header className="mt-6 border-b border-line pb-8">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{page.title}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{page.intro}</p>
        </header>

        <div className="mt-8 grid gap-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-ink">{section.title}</h2>
              <div className="mt-2 grid gap-3">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-[15px] leading-relaxed text-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {(settings.support_email?.trim() || hasWhatsapp) && (
          <div className="mt-12 rounded-2xl bg-surface p-5 sm:p-6">
            <h2 className="text-base font-semibold text-ink">Ficou com alguma dúvida?</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">Fale com a nossa equipe de atendimento.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {settings.support_email?.trim() && (
                <a
                  href={`mailto:${settings.support_email.trim()}`}
                  className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-[#d0d5dd] hover:text-brand"
                >
                  <Mail size={16} className="shrink-0 text-brand" />
                  <span className="min-w-0 truncate">{settings.support_email.trim()}</span>
                </a>
              )}
              {hasWhatsapp && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-[#d0d5dd] hover:text-brand"
                >
                  <MessageCircle size={16} className="shrink-0 text-brand" />
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        )}

        <div className="mt-10">
          <p className="text-sm font-semibold text-ink">Veja também</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {related.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-5 py-4 transition hover:border-[#d0d5dd] hover:shadow-soft"
              >
                <span className="text-sm font-semibold text-ink transition-colors group-hover:text-brand">
                  {item.title}
                </span>
                <ChevronRight size={18} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
