import { createClient } from '@supabase/supabase-js'

// Server-only Supabase access. SUPABASE_SECRET_KEY must never reach the
// frontend, a log, or an HTTP response.
export const SUPABASE_URL = process.env.SUPABASE_URL
export const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY

export function missingSupabaseEnv() {
  return ['SUPABASE_URL', 'SUPABASE_SECRET_KEY'].filter(
    (name) => !process.env[name],
  )
}

export function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
