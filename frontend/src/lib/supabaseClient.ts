import { createClient } from '@supabase/supabase-js'

// Browser Supabase client. Only the publishable key (sb_publishable_...)
// may be used here — the secret key must never reach the frontend.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabasePublishableKey = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY as string

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
