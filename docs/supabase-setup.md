# Supabase setup guide (PROM-12)

Create the Supabase project yourself (free plan) and put the keys in the `.env`
files. Never commit `.env` files and never paste real keys in chat, Jira, or PRs.

This project uses the **new Supabase key format**: a **publishable** key in the
frontend and a **secret** key in the backend only.

## 1. Create the project

1. Go to <https://supabase.com> and sign in (or create an account).
2. Click **New project**.
3. Choose the **Free** plan, pick a project name (e.g. `focusroom`), set a
   database password (store it somewhere safe), choose a region close to you,
   and click **Create new project**.
4. Wait for provisioning (1–2 minutes).

## 2. Find the three values

Open your project dashboard → **Project Settings** (gear icon) → **API Keys**.

> If you only see legacy keys (`anon`, `service_role`), click
> **"Create new API keys"** to generate the new-style keys first.

| Value | Where | Goes to |
| --- | --- | --- |
| **Project URL** | Settings → API Keys (or Settings → Data API) | `backend/.env` → `SUPABASE_URL` and `frontend/.env` → `VITE_SUPABASE_URL` |
| **Publishable key** | Starts with `sb_publishable_...` | `frontend/.env` → `VITE_SUPABASE_PUBLISHABLE_KEY` |
| **Secret key** | Starts with `sb_secret_...` (click reveal) | `backend/.env` → `SUPABASE_SECRET_KEY` — backend only |

Safety rules:

- The **publishable** key is the only key allowed in the frontend. `VITE_*`
  variables are bundled into the client code — anyone can read them. The
  publishable key is designed for that (protected by Row Level Security).
- The **secret** key (`sb_secret_...`) bypasses Row Level Security. It must
  exist **only** in `backend/.env`: never in the frontend, never in a log,
  never in an HTTP response, never in the repository.

## 3. Fill the .env files

Backend — `backend/.env` (copy from `backend/.env.example` first):

```
PORT=3001
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SECRET_KEY=<your sb_secret_... key>
```

Frontend — `frontend/.env` (copy from `frontend/.env.example` first):

```
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your sb_publishable_... key>
```

## 4. Restart and verify

1. Restart the backend (`npm run dev` in `backend/`).
2. Open <http://localhost:3001/health/db> — it should return `{"status":"ok"}`.
3. Restart the Vite dev server (`npm run dev` in `frontend/`) so it picks up
   the new env variables.

If `/health/db` reports a missing variable, check the variable name spelled in
the message against the corresponding `.env` line. If it reports that Supabase
cannot be reached or returned an HTTP error, check that the Project URL is
correct and that the secret key is the new-style `sb_secret_...` key.
