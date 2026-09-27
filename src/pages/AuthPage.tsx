import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, EmptyState, Input, useToast } from '../components/ui'
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
import { isValidCpf, maskCpf } from '../utils/masks'

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register' | 'reset-request' | 'reset-confirm'>('login')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { notify } = useToast()
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
      notify(error instanceof Error ? error.message : 'Erro de autenticacao', 'error')
    }
  }

  if (isStoreDemoMode) {
    return (
      <section className="container py-10">
        <EmptyState title="Acesso temporariamente indisponível" description={STORE_DEMO_MESSAGE} />
        <div className="mt-6 flex justify-center">
          <Link to="/">
            <Button variant="secondary">Voltar para a loja</Button>
          </Link>
        </div>
      </section>
    )
  }

  return (
    <>
      <Helmet>
        <title>
          {mode === 'login' ? 'Login' : mode === 'register' ? 'Cadastro' : 'Recuperar senha'} - Passarin
          Suplementos
        </title>
      </Helmet>
      <section className="container grid min-h-[70vh] place-items-center py-10">
        <div className="w-full max-w-md rounded-[2rem] border border-gray-100 bg-white p-8 shadow-soft">
          <h1 className="text-3xl font-black text-black">
            {mode === 'login'
              ? 'Entrar'
              : mode === 'register'
                ? 'Criar conta'
                : mode === 'reset-request'
                  ? 'Recuperar senha'
                  : 'Criar nova senha'}
          </h1>
          {mode === 'reset-confirm' && (
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              Digite o código de 6 dígitos enviado para <strong className="text-gray-800">{recoveryEmail}</strong>.
            </p>
          )}
          <form className="mt-6 grid gap-4" onSubmit={handleSubmit(onSubmit)}>
            {mode === 'register' && <Input placeholder="Nome completo" {...register('nome')} />}
            {mode === 'register' && (
              <Input
                {...cpfField}
                inputMode="numeric"
                autoComplete="off"
                maxLength={14}
                placeholder="CPF (000.000.000-00)"
                onChange={(event) => {
                  event.target.value = maskCpf(event.target.value)
                  void cpfField.onChange(event)
                }}
              />
            )}
            {mode !== 'reset-confirm' && <Input type="email" placeholder="Email" {...register('email')} />}
            {(mode === 'login' || mode === 'register') && (
              <Input type="password" placeholder="Senha" {...register('password')} />
            )}
            {mode === 'reset-confirm' && (
              <>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="Código de 6 dígitos"
                  value={recoveryCode}
                  onChange={(event) => setRecoveryCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Nova senha (mínimo 8 caracteres)"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirmar nova senha"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </>
            )}
            {mode !== 'reset-confirm' && formState.errors.email && (
              <p className="text-sm text-red-600">{formState.errors.email.message}</p>
            )}
            {mode === 'register' && formState.errors.cpf && (
              <p className="text-sm text-red-600">{formState.errors.cpf.message}</p>
            )}
            <Button type="submit" disabled={formState.isSubmitting} className="w-full">
              {formState.isSubmitting
                ? 'Aguarde...'
                : mode === 'login'
                  ? 'Entrar'
                  : mode === 'register'
                    ? 'Cadastrar'
                    : mode === 'reset-request'
                      ? 'Enviar código'
                      : 'Salvar nova senha'}
            </Button>
          </form>
          <div className="mt-6 grid gap-2 text-sm">
            {(mode === 'login' || mode === 'register') && (
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-left font-bold text-gray-900 underline hover:text-brand"
              >
                {mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho conta'}
              </button>
            )}
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => setMode('reset-request')}
                className="text-left font-bold text-gray-900 underline hover:text-brand"
              >
                Esqueci minha senha
              </button>
            )}
            {(mode === 'reset-request' || mode === 'reset-confirm') && (
              <button
                type="button"
                onClick={() => setMode(mode === 'reset-confirm' ? 'reset-request' : 'login')}
                className="text-left font-bold text-gray-900 underline hover:text-brand"
              >
                {mode === 'reset-confirm' ? 'Enviar outro código' : 'Voltar para o login'}
              </button>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
