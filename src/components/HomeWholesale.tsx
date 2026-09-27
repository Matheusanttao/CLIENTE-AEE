import { MessageCircle } from 'lucide-react'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { brandPhoto } from '../lib/brandImages'
import { buildWhatsappUrl } from '../types/settings'
import { HomeCta } from './HomeCta'

const steps = [
  {
    title: 'Escolha os produtos no catálogo',
    text: 'Veja os modelos disponíveis e anote os que você quer.',
  },
  {
    title: 'Fale com a gente pelo WhatsApp',
    text: 'Envie sua lista e tire suas dúvidas com a nossa equipe.',
  },
  {
    title: 'Combine o envio e receba',
    text: 'Defina com a equipe a melhor forma de entrega.',
  },
]

/** Faixa de atacado (ancora #atacado). Sem condicoes comerciais fixas: tudo e combinado no WhatsApp. */
export function HomeWholesale() {
  const { settings } = useSiteSettings()
  const whatsappDigits = settings.whatsapp_number.replace(/\D/g, '')
  const whatsappHref =
    whatsappDigits.length >= 10
      ? buildWhatsappUrl(whatsappDigits, `Olá! Tenho interesse em comprar no atacado na ${settings.store_name}.`)
      : ''

  return (
    <section
      id="atacado"
      aria-labelledby="atacado-titulo"
      className="mt-12 scroll-mt-32 bg-brand-soft md:mt-16"
    >
      <div className="container grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-hover">Atacado</p>
          <h2
            id="atacado-titulo"
            className="mt-1 text-balance text-[1.75rem] font-bold leading-tight tracking-tight text-ink sm:text-4xl"
          >
            Compre em quantidade para revender
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink/70 sm:text-base">
            Monte seu pedido com os modelos que quiser e fale com a nossa equipe pelo WhatsApp para combinar
            quantidades, valores e envio.
          </p>

          <ol className="mt-8 grid gap-3 sm:grid-cols-3 sm:gap-4">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-4 rounded-2xl bg-white p-4 shadow-card sm:flex-col sm:gap-3 sm:p-5"
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand-hover tabular-nums"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold leading-snug text-ink sm:text-[15px]">
                    <span className="sr-only">Passo {index + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {whatsappHref && (
              <HomeCta href={whatsappHref} external size="lg">
                <MessageCircle size={18} aria-hidden />
                Falar no WhatsApp
              </HomeCta>
            )}
            <HomeCta to="/catalogo" variant="secondary" size="lg">
              Ver catálogo
            </HomeCta>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div className="aspect-[9/10] overflow-hidden rounded-2xl bg-sand">
            <img
              src={brandPhoto('sneakerOnFoot', 900, 1000)}
              alt="Pessoa calçando um tênis branco"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-6 -left-8 w-36 overflow-hidden rounded-2xl border-4 border-white bg-sand shadow-soft xl:w-40">
            <div className="aspect-[4/5]">
              <img
                src={brandPhoto('perfumeStand', 400, 500)}
                alt="Frasco de perfume em suporte branco"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
