import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Lock, Package, Settings, ShoppingBag, Tag } from 'lucide-react'
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
      if (!userId) throw new Error('Não foi possível autenticar')

      const { data: profile, error: profileError } = await supabase
        .from('usuarios')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) throw profileError

      // Somente usuarios.role no banco libera admin — nunca user_metadata.
      if (profile?.role !== 'admin') {
        await supabase.auth.signOut()
        throw new Error('Esta conta não tem acesso ao painel administrativo')
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
        <title>{`Admin · ${storeName}`}</title>
      </Helmet>

      <div className="min-h-screen bg-surface">
        <header className="border-b border-line bg-white">
          <div className="container flex h-[72px] items-center justify-between gap-4">
            {settingsLoading ? (
              <div className="h-10 w-36 animate-pulse rounded-lg bg-surface" aria-hidden />
            ) : (
              <Link to="/" className="flex min-w-0 items-center gap-3 text-ink" aria-label={`Ir para a loja ${storeName}`}>
                {customLogo ? (
                  <img
                    src={settings.logo_url}
                    alt={storeName}
                    className="h-10 w-auto max-w-[160px] object-contain object-left sm:h-11"
                    decoding="async"
                    fetchPriority="high"
                  />
                ) : (
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white">
                    <span className="text-sm font-bold tracking-tight">{brandInitials}</span>
                  </span>
                )}
                {(settings.logo_show_text || !customLogo) && (
                  <span className="min-w-0 truncate text-lg font-bold tracking-tight">{storeName}</span>
                )}
              </Link>
            )}

            <Link
              to="/"
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-[#D0D5DD] hover:bg-surface"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Voltar para a loja</span>
              <span className="sm:hidden">Loja</span>
            </Link>
          </div>
        </header>

        <main className="container grid items-center gap-8 py-10 sm:py-14 lg:min-h-[calc(100vh-72px)] lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16 lg:py-16">
          <div className="mx-auto w-full max-w-[440px] lg:mx-0 lg:max-w-lg">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
              <Lock size={15} />
              Acesso restrito
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Painel administrativo
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Gerencie o catálogo, acompanhe pedidos e ajuste a aparência da {storeName} em um só lugar.
            </p>

            <ul className="mt-8 hidden gap-3 sm:grid sm:grid-cols-2">
              <FeatureItem icon={<Package size={18} />} label="Catálogo e estoque" />
              <FeatureItem icon={<ShoppingBag size={18} />} label="Pedidos e clientes" />
              <FeatureItem icon={<Tag size={18} />} label="Cupons de desconto" />
              <FeatureItem icon={<Settings size={18} />} label="Configurações da loja" />
            </ul>
          </div>

          <div className="mx-auto w-full max-w-[440px] animate-float-up lg:mx-0 lg:justify-self-end">
            <div className="rounded-2xl border border-line bg-white p-6 shadow-soft sm:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-ink">Entrar no painel</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">Use sua conta administrativa para continuar.</p>
              </div>

              {user && !isAdmin && (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
                  A conta atual não é administrativa. Entre com um usuário admin.
                </div>
              )}

              <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
                <div className="grid gap-1.5">
                  <label htmlFor="admin-login-email" className="text-sm font-medium text-ink">
                    E-mail
                  </label>
                  <Input
                    id="admin-login-email"
                    type="email"
                    placeholder="admin@exemplo.com"
                    autoComplete="username"
                    aria-invalid={Boolean(formState.errors.email)}
                    {...register('email')}
                  />
                  {formState.errors.email && (
                    <p className="text-sm text-danger">{formState.errors.email.message}</p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="admin-login-password" className="text-sm font-medium text-ink">
                    Senha
                  </label>
                  <Input
                    id="admin-login-password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    aria-invalid={Boolean(formState.errors.password)}
                    {...register('password')}
                  />
                  {formState.errors.password && (
                    <p className="text-sm text-danger">{formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" disabled={formState.isSubmitting} className="mt-2 w-full">
                  {formState.isSubmitting ? 'Entrando...' : 'Acessar painel'}
                  {!formState.isSubmitting && <ArrowRight size={16} />}
                </Button>
              </form>
            </div>
            <p className="mt-4 text-center text-xs text-muted">
              Área exclusiva para administradores da {storeName}.
            </p>
          </div>
        </main>
      </div>
    </>
  )
}

function FeatureItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-mint text-brand">{icon}</span>
      {label}
    </li>
  )
}
