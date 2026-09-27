import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Check, Eye, EyeOff } from 'lucide-react'
import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, EmptyState, Input, useToast } from '../components/ui'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { brandPhoto } from '../lib/brandImages'
import { authPageSchema, type AuthPageInput } from '../schemas'
import { isStoreDemoMode, STORE_DEMO_MESSAGE } from '../lib/storeMode'
import { supabase } from '../lib/supabase'
import {
  confirmPasswordResetCode,
  requestPasswordResetCode,
  requestWelcomeEmail,
  signIn,
  signUp,
} from '../services/auth'
import { cn } from '../utils/cn'
import { isValidCpf, maskCpf } from '../utils/masks'

type AuthMode = 'login' | 'register' | 'reset-request' | 'reset-confirm'

const pageTitles: Record<AuthMode, string> = {
  login: 'Login',
  register: 'Criar conta',
  'reset-request': 'Recuperar senha',
  'reset-confirm': 'Criar nova senha',
}

const headings: Record<AuthMode, string> = {
  login: 'Entrar na sua conta',
  register: 'Criar conta',
  'reset-request': 'Recuperar senha',
  'reset-confirm': 'Criar nova senha',
}

const subtitles: Record<Exclude<AuthMode, 'reset-confirm'>, string> = {
  login: 'Acompanhe seus pedidos, endereços e favoritos em um só lugar.',
  register: 'Cadastre-se para comprar com mais agilidade e acompanhar seus pedidos.',
  'reset-request': 'Informe o e-mail da sua conta e enviaremos um código de 6 dígitos.',
}

const accountPerks = [
  'Acompanhe seus pedidos e a entrega',
  'Salve endereços para comprar mais rápido',
  'Guarde seus produtos favoritos',
]

const textLinkClass =
  'rounded-md text-sm font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15'

function Field({
  label,
  htmlFor,
  error,
  aside,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}

function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className="pr-12" />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { notify } = useToast()
  const { settings } = useSiteSettings()
  const { register, handleSubmit, formState } = useForm<AuthPageInput>({
    resolver: zodResolver(authPageSchema),
  })
  const cpfField = register('cpf')

  const onSubmit = async (values: AuthPageInput) => {
    try {
      if (mode === 'reset-request') {
        const result = await requestPasswordResetCode(values.email)
        setRecoveryEmail(values.email.trim().toLowerCase())
        setMode('reset-confirm')
        notify(result?.message ?? 'Código de recuperação enviado')
        return
      }
      if (mode === 'reset-confirm') {
        if (!/^\d{6}$/.test(recoveryCode)) throw new Error('Informe o código de 6 dígitos')
        if (newPassword.length < 8) throw new Error('A nova senha precisa ter pelo menos 8 caracteres')
        if (newPassword !== confirmPassword) throw new Error('As senhas não são iguais')
        await confirmPasswordResetCode(recoveryEmail, recoveryCode, newPassword)
        notify('Senha atualizada. Entre com sua nova senha.')
        setRecoveryCode('')
        setNewPassword('')
        setConfirmPassword('')
        setMode('login')
        return
      }
      if (!values.password) throw new Error('Informe sua senha')
      if (mode === 'register' && !values.nome) throw new Error('Informe seu nome')
      if (mode === 'register' && (!values.cpf || !isValidCpf(values.cpf))) {
        throw new Error('Informe um CPF válido')
      }
      const result =
        mode === 'register'
          ? await signUp({
              email: values.email,
              password: values.password,
              nome: values.nome ?? '',
              cpf: values.cpf ?? '',
            })
          : await signIn({ email: values.email, password: values.password })
      if (result.error) throw result.error

      const userId = result.data.user?.id
      if (mode === 'register' && userId) {
        try {
          await requestWelcomeEmail(userId, values.email)
        } catch (emailError) {
          console.error('Erro ao enviar e-mail de boas-vindas:', emailError)
          notify('Conta criada, mas não foi possível enviar o e-mail de boas-vindas.', 'error')
        }
      }

      if (mode === 'register' && !result.data.session) {
        notify('Cadastro realizado. Confirme o e-mail enviado para ativar sua conta.')
        setMode('login')
        return
      }

      if (mode === 'login' && result.data.session) {
        void requestWelcomeEmail().catch(() => undefined)
      }

      let destination = '/minha-conta'

      if (userId) {
        const { data: profile } = await supabase.from('usuarios').select('role').eq('id', userId).maybeSingle()
        if (profile?.role === 'admin') destination = '/admin'
      }

      const redirect = searchParams.get('redirect')
      if (redirect?.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/admin')) {
        destination = redirect
      }

      notify(mode === 'register' ? 'Cadastro realizado' : 'Login realizado')
      navigate(destination)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro de autenticação', 'error')
    }
  }

  if (isStoreDemoMode) {
    return (
      <section className="container py-12 md:py-16">
        <div className="mx-auto max-w-xl">
          <EmptyState title="Acesso temporariamente indisponível" description={STORE_DEMO_MESSAGE} />
          <div className="mt-6 flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-[#d0d5dd] hover:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
            >
              Voltar para a loja
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const isAccessMode = mode === 'login' || mode === 'register'
  const submitLabel = formState.isSubmitting
    ? 'Aguarde...'
    : mode === 'login'
      ? 'Entrar'
      : mode === 'register'
        ? 'Criar conta'
        : mode === 'reset-request'
          ? 'Enviar código'
          : 'Salvar nova senha'

  return (
    <>
      <Helmet>
        <title>{`${pageTitles[mode]} - ${settings.store_name}`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <section className="container py-10 md:py-16">
        <div className="grid items-stretch gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
              {isAccessMode && (
                <div
                  role="tablist"
                  aria-label="Acesso à conta"
                  className="mb-7 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1"
                >
                  {(['login', 'register'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={mode === tab}
                      onClick={() => setMode(tab)}
                      className={cn(
                        'h-10 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15',
                        mode === tab ? 'bg-white text-ink shadow-card' : 'text-muted hover:text-ink',
                      )}
                    >
                      {tab === 'login' ? 'Entrar' : 'Criar conta'}
                    </button>
                  ))}
                </div>
              )}

              {!isAccessMode && (
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="mb-6 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15"
                >
                  <ArrowLeft size={16} />
                  Voltar para o login
                </button>
              )}

              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{headings[mode]}</h1>
              {mode === 'reset-confirm' ? (
                <p className="mt-2 text-[15px] leading-relaxed text-muted">
                  Digite o código de 6 dígitos enviado para{' '}
                  <strong className="font-semibold text-ink">{recoveryEmail}</strong>.
                </p>
              ) : (
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{subtitles[mode]}</p>
              )}

              <form className="mt-7 grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                {mode === 'register' && (
                  <Field label="Nome completo" htmlFor="auth-nome">
                    <Input
                      id="auth-nome"
                      autoComplete="name"
                      placeholder="Seu nome e sobrenome"
                      {...register('nome')}
                    />
                  </Field>
                )}
                {mode === 'register' && (
                  <Field label="CPF" htmlFor="auth-cpf" error={formState.errors.cpf?.message}>
                    <Input
                      id="auth-cpf"
                      {...cpfField}
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={14}
                      placeholder="000.000.000-00"
                      onChange={(event) => {
                        event.target.value = maskCpf(event.target.value)
                        void cpfField.onChange(event)
                      }}
                    />
                  </Field>
                )}
                {mode !== 'reset-confirm' && (
                  <Field label="E-mail" htmlFor="auth-email" error={formState.errors.email?.message}>
                    <Input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      placeholder="voce@email.com"
                      {...register('email')}
                    />
                  </Field>
                )}
                {isAccessMode && (
                  <Field
                    label="Senha"
                    htmlFor="auth-password"
                    aside={
                      mode === 'login' ? (
                        <button type="button" onClick={() => setMode('reset-request')} className={textLinkClass}>
                          Esqueci minha senha
                        </button>
                      ) : undefined
                    }
                  >
                    <PasswordInput
                      id="auth-password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder={mode === 'login' ? 'Sua senha' : 'Crie uma senha'}
                      {...register('password')}
                    />
                  </Field>
                )}
                {mode === 'reset-confirm' && (
                  <>
                    <Field label="Código de verificação" htmlFor="auth-code">
                      <Input
                        id="auth-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="000000"
                        className="tracking-[0.3em] tabular-nums"
                        value={recoveryCode}
                        onChange={(event) => setRecoveryCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      />
                    </Field>
                    <Field label="Nova senha" htmlFor="auth-new-password">
                      <PasswordInput
                        id="auth-new-password"
                        autoComplete="new-password"
                        placeholder="Mínimo de 8 caracteres"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                      />
                    </Field>
                    <Field label="Confirmar nova senha" htmlFor="auth-confirm-password">
                      <PasswordInput
                        id="auth-confirm-password"
                        autoComplete="new-password"
                        placeholder="Repita a nova senha"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                      />
                    </Field>
                  </>
                )}

                <Button type="submit" disabled={formState.isSubmitting} className="mt-2 w-full">
                  {submitLabel}
                </Button>
              </form>

              <div className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">
                {mode === 'login' && (
                  <p>
                    Ainda não tem conta?{' '}
                    <button type="button" onClick={() => setMode('register')} className={textLinkClass}>
                      Criar conta
                    </button>
                  </p>
                )}
                {mode === 'register' && (
                  <p>
                    Já tem conta?{' '}
                    <button type="button" onClick={() => setMode('login')} className={textLinkClass}>
                      Entrar
                    </button>
                  </p>
                )}
                {mode === 'reset-request' && (
                  <p>
                    Lembrou a senha?{' '}
                    <button type="button" onClick={() => setMode('login')} className={textLinkClass}>
                      Entrar
                    </button>
                  </p>
                )}
                {mode === 'reset-confirm' && (
                  <p>
                    Não recebeu o código?{' '}
                    <button type="button" onClick={() => setMode('reset-request')} className={textLinkClass}>
                      Enviar outro código
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="relative hidden min-h-[600px] overflow-hidden rounded-2xl bg-sand lg:block">
            <img
              src={brandPhoto('sneakerBeige', 1000, 1200)}
              alt="Tênis branco sobre tecido bege"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-x-6 bottom-6 rounded-2xl bg-white p-6 shadow-soft">
              <p className="text-sm font-semibold text-brand">{settings.store_name}</p>
              <p className="mt-1 text-xl font-bold tracking-tight text-ink">Tudo da sua conta em um só lugar</p>
              <ul className="mt-4 grid gap-2.5">
                {accountPerks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2.5 text-sm text-ink-soft">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-mint text-brand">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
