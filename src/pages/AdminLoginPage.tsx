import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Lock, Package, ShoppingBag } from 'lucide-react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Helmet } from 'react-helmet-async'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button, Input, useToast } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { loginSchema, type LoginInput } from '../schemas'
import { supabase } from '../lib/supabase'
import { signIn } from '../services/auth'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAdmin, signOut } = useAuth()
  const { settings, loading: settingsLoading } = useSiteSettings()
  const { notify } = useToast()
  const { register, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const destination = location.pathname.startsWith('/admin') ? location.pathname : '/admin'
  const storeName = settings.store_name?.trim() || 'Minha loja'
  const storeShort = settings.store_name_short?.trim() || storeName
  const brandInitials = storeShort.slice(0, 3).toUpperCase()
  const customLogo = settings.logo_enabled && Boolean(settings.logo_url?.trim())

  const onSubmit = async (values: LoginInput) => {
    try {
      if (user) await signOut()

      const result = await signIn(values)
      if (result.error) throw result.error

      const userId = result.data.user?.id
      if (!userId) throw new Error('Nao foi possivel autenticar')

      const { data: profile, error: profileError } = await supabase
        .from('usuarios')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) throw profileError

      // Somente usuarios.role no banco libera admin — nunca user_metadata.
      if (profile?.role !== 'admin') {
        await supabase.auth.signOut()
        throw new Error('Esta conta nao tem acesso ao painel administrativo')
      }

      notify('Acesso liberado')
      navigate(destination, { replace: true })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Erro ao entrar no admin', 'error')
    }
  }

  return (
    <>
      <Helmet>
        <title>Admin - {storeName}</title>
      </Helmet>

      <div className="relative min-h-screen overflow-hidden bg-[#fcfcfb]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 0% -10%, rgba(196, 240, 0, 0.18), transparent 28rem), radial-gradient(circle at 100% 0%, rgba(13, 15, 18, 0.04), transparent 26rem), linear-gradient(180deg, #f4f5f2 0%, #fcfcfb 42%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-brand/25 blur-[90px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 bottom-10 h-56 w-56 rounded-full bg-brand/15 blur-[80px]"
        />

        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4 animate-float-up">
            {settingsLoading ? (
              <div className="h-10 w-48 animate-pulse rounded-xl bg-ink/10" aria-hidden />
            ) : (
              <Link to="/" className="flex min-w-0 items-center gap-2.5 text-ink">
                {customLogo ? (
                  <img
                    src={settings.logo_url}
                    alt={storeName}
                    className="h-10 w-auto max-w-[140px] object-contain object-left"
                    decoding="async"
                    fetchPriority="high"
                  />
                ) : (
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-ink shadow-brand">
                    <span className="font-display text-sm font-black tracking-tight">{brandInitials}</span>
                  </span>
                )}
                {(settings.logo_show_text || !customLogo) && (
                  <span className="min-w-0 leading-none">
                    <strong className="block truncate font-display text-xl font-extrabold tracking-tight">
                      {storeName}
                    </strong>
                    <small className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-muted">
                      Painel admin
                    </small>
                  </span>
                )}
                {customLogo && !settings.logo_show_text && (
                  <span className="min-w-0 leading-none">
                    <small className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-muted">
                      Painel admin
                    </small>
                  </span>
                )}
              </Link>
            )}

            <Link
              to="/"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-ink/20 hover:bg-surface"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Voltar para a loja</span>
              <span className="sm:hidden">Loja</span>
            </Link>
          </header>

          <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-16">
            <div className="animate-float-up max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-mint px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink">
                <Lock size={12} />
                Acesso restrito
              </span>

              <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl">
                Entre no painel da{' '}
                <span className="text-ink">sua loja</span>
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
                Gerencie produtos, pedidos e cupons com a mesma identidade visual da {storeName}.
              </p>

              <div className="mt-8 hidden gap-3 sm:grid sm:grid-cols-2">
                <FeatureChip icon={<Package size={16} />} label="Catalogo e estoque" />
                <FeatureChip icon={<ShoppingBag size={16} />} label="Pedidos e clientes" />
              </div>
            </div>

            <div className="w-full max-w-[440px] justify-self-center lg:justify-self-end animate-float-up">
              <div className="rounded-[1.75rem] border border-black/[0.06] bg-white p-7 shadow-soft sm:p-8">
                <div className="mb-6">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                    Login seguro
                  </div>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                    Entrar no admin
                  </h2>
                  <p className="mt-1 text-sm text-muted">Use sua conta administrativa.</p>
                </div>

                {user && !isAdmin && (
                  <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-950">
                    A conta atual nao e administrativa. Entre com um usuario admin.
                  </div>
                )}

                <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                      E-mail
                    </label>
                    <Input
                      type="email"
                      placeholder="admin@exemplo.com"
                      autoComplete="username"
                      {...register('email')}
                    />
                    {formState.errors.email && (
                      <p className="mt-1 text-sm text-red-600">{formState.errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                      Senha
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...register('password')}
                    />
                    {formState.errors.password && (
                      <p className="mt-1 text-sm text-red-600">{formState.errors.password.message}</p>
                    )}
                  </div>
                  <Button type="submit" disabled={formState.isSubmitting} className="mt-2 w-full">
                    {formState.isSubmitting ? 'Entrando...' : 'Acessar painel'}
                    {!formState.isSubmitting && <ArrowRight size={16} />}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function FeatureChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-white/80 px-4 py-3 text-sm font-semibold text-ink shadow-sm backdrop-blur">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand text-ink">{icon}</span>
      {label}
    </div>
  )
}
