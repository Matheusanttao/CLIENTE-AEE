/* eslint-disable react-refresh/only-export-components */
import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  user: User | null
  session: Session | null
  isAdmin: boolean
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const syncSession = (nextSession: Session | null) => {
      setLoading(true)
      setSession(nextSession)

      if (!nextSession?.user) {
        setRole(null)
        setLoading(false)
        return
      }

      supabase
        .from('usuarios')
        .select('role')
        .eq('id', nextSession.user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          // Autorizacao admin so vem da tabela usuarios (RLS). Nunca confiar em user_metadata.
          if (error) console.warn('Erro ao buscar role do usuario:', error.message)
          setRole(data?.role ?? null)
          setLoading(false)
        })
    }

    supabase.auth.getSession().then(({ data }) => syncSession(data.session))

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      syncSession(nextSession)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isAdmin: role === 'admin',
      loading,
      signOut: async () => {
        await supabase.auth.signOut()
      },
    }),
    [loading, role, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return context
}
