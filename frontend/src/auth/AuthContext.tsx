import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient.js'
import { friendlyAuthErrorMessage } from '../lib/authErrors.js'
import { AuthContext, type AuthContextValue } from './authContext.js'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Read the current session on load (Supabase persists the session itself;
  // no custom storage code here) and keep it in sync afterwards.
  useEffect(() => {
    let mounted = true
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) {
          setSession(data.session)
          setLoading(false)
        }
      })
      .catch(() => {
        if (mounted) {
          setLoading(false)
        }
      })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      throw new Error(friendlyAuthErrorMessage(error))
    }
    // With email confirmation enabled, an already-registered email returns a
    // user with an empty identities array instead of an error.
    const identities = data.user?.identities
    if (Array.isArray(identities) && identities.length === 0) {
      throw new Error('This email is already registered. Try logging in instead.')
    }
    return { needsEmailConfirmation: data.session === null }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      throw new Error(friendlyAuthErrorMessage(error))
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(friendlyAuthErrorMessage(error))
    }
  }

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
