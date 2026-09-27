import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { buildBreadcrumbJsonLd } from '../lib/seo'

const pages = {
  privacidade: {
    title: 'Politica de Privacidade',
    path: '/privacidade',
    description:
      'Politica de privacidade da Passarim Suplementos em Betim: como coletamos, usamos e protegemos seus dados.',
    content: [
      'Coletamos dados como nome, e-mail, endereco e historico de compras para processar pedidos e melhorar sua experiencia.',
      'Seus dados de pagamento sao processados pelo Mercado Pago. A Passarin Suplementos nao armazena dados completos de cartao.',
      'Utilizamos Supabase para autenticacao e armazenamento seguro de informacoes da conta.',
      'Voce pode solicitar acesso, correcao ou exclusao dos seus dados pelo e-mail contato@fitstore.com.br.',
      'Esta politica pode ser atualizada. Recomendamos revisar periodicamente.',
    ],
  },
  termos: {
    title: 'Termos de Uso',
    path: '/termos',
    description:
      'Termos de uso da Passarim Suplementos em Betim: regras de compra, estoque, precos e uso da loja online.',
    content: [
      'Ao utilizar a Passarin Suplementos, voce concorda com estes termos e com nossa politica de privacidade.',
      'Os precos, promocoes e estoque podem ser alterados sem aviso previo enquanto o pedido nao for confirmado.',
      'Pedidos ficam sujeitos a confirmacao de pagamento e disponibilidade de estoque.',
      'E proibido utilizar a loja para fins fraudulentos ou ilegais.',
      'A Passarin Suplementos pode suspender contas em caso de uso indevido ou suspeita de fraude.',
    ],
  },
  trocas: {
    title: 'Trocas e Devolucoes',
    path: '/trocas-devolucoes',
    description:
      'Politica de trocas e devolucoes da Passarim Suplementos em Betim, conforme o Codigo de Defesa do Consumidor.',
    content: [
      'Voce pode solicitar troca ou devolucao em ate 7 dias corridos apos o recebimento, conforme o Codigo de Defesa do Consumidor.',
      'Produtos devem estar lacrados, sem uso e com embalagem original, salvo defeito de fabricacao.',
      'Para iniciar uma troca ou devolucao, entre em contato pelo e-mail contato@fitstore.com.br informando numero do pedido.',
      'Reembolsos seguem o mesmo meio de pagamento utilizado na compra, apos analise do produto devolvido.',
      'Frete de devolucao por arrependimento pode ser de responsabilidade do cliente, salvo produto com defeito.',
    ],
  },
} as const

type LegalType = keyof typeof pages

export function LegalPage({ type }: { type: LegalType }) {
  const page = pages[type]

  return (
    <>
      <Seo
        title={`${page.title} | Passarim Suplementos Betim`}
        description={page.description}
        path={page.path}
        jsonLd={buildBreadcrumbJsonLd([
          { name: 'Início', path: '/' },
          { name: page.title, path: page.path },
        ])}
      />
      <section className="container max-w-3xl py-10">
        <Link to="/" className="text-sm font-bold text-gray-500 hover:text-black">
          ← Voltar para a loja
        </Link>
        <h1 className="mt-6 text-4xl font-black text-black">{page.title}</h1>
        <div className="mt-8 grid gap-4 text-gray-600">
          {page.content.map((paragraph) => (
            <p key={paragraph} className="leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
        <p className="mt-8 text-sm text-gray-400">
          Ultima atualizacao: {new Date().toLocaleDateString('pt-BR')}
        </p>
      </section>
    </>
  )
}
