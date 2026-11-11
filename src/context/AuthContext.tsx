import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { PREVIEW } from '@/lib/utils'

type AuthValue = {
  ready: boolean
  email: string | null
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    if (PREVIEW) {
      setReady(true)
      return
    }
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setEmail(data.session?.user.email ?? null)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null)
      setReady(true)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function signIn(nextEmail: string, password: string): Promise<string | null> {
    if (PREVIEW) {
      setEmail(nextEmail.trim())
      return null
    }
    const { error } = await supabase.auth.signInWithPassword({ email: nextEmail.trim(), password })
    if (!error) return null
    if (/invalid login/i.test(error.message)) return 'E-mail ou senha não conferem.'
    if (/email not confirmed/i.test(error.message)) return 'Este e-mail ainda não foi confirmado no Supabase.'
    return 'Não foi possível entrar. Tente de novo.'
  }

  async function signOut() {
    if (!PREVIEW) await supabase.auth.signOut()
    setEmail(null)
  }

  return <AuthContext.Provider value={{ ready, email, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('Auth ausente')
  return value
}
