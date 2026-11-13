import express from 'express'
import {
  SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  missingSupabaseEnv,
  getSupabaseAdmin,
} from './supabaseAdmin.js'

const app = express()
const PORT = process.env.PORT || 3001

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/health/db', async (_req, res) => {
  const missing = missingSupabaseEnv()
  if (missing.length > 0) {
    return res.status(503).json({
      status: 'error',
      error: `Missing environment variable(s): ${missing.join(', ')}. Add them to backend/.env (see docs/supabase-setup.md) and restart the server.`,
    })
  }

  try {
    getSupabaseAdmin()
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      },
    })
    if (response.ok) {
      return res.json({ status: 'ok' })
    }
    return res.status(503).json({
      status: 'error',
      error: `Supabase REST API returned HTTP ${response.status}. Check SUPABASE_URL and SUPABASE_SECRET_KEY in backend/.env (the secret key must start with sb_secret_).`,
    })
  } catch {
    return res.status(503).json({
      status: 'error',
      error: 'Cannot reach Supabase. Check SUPABASE_URL in backend/.env and your network connection.',
    })
  }
})

app.listen(PORT, () => {
  console.log(`FocusRoom backend listening on port ${PORT}`)
})
