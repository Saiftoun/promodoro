# FocusRoom

FocusRoom is a web-only Pomodoro co-working app: virtual focus rooms where a host runs a shared Pomodoro timer, assigns tasks, and keeps the room accountable.

Project tracking: Jira project `PROM` on `saiftounsi.atlassian.net` (backlog PROM-1 → PROM-60). Spec: `pomodoro-room-project.html`.

## Folder structure

```
promodoro/
├── frontend/   # React app built with Vite (TypeScript)
│   ├── src/          # App source (main.tsx, App.tsx placeholder)
│   ├── eslint.config.js
│   └── .env.example
├── backend/    # Node.js + Express API server
│   ├── src/server.js # GET /health → {"status":"ok"}
│   ├── eslint.config.js
│   └── .env.example
├── AGENTS.md   # Working conventions (Jira workflow, hard rules)
└── README.md
```

## Prerequisites

- Node.js ≥ 20 (tested with 22) and npm ≥ 10
- Windows PowerShell (commands below are PowerShell)

## Run the backend

```powershell
cd backend
npm install
copy .env.example .env   # then edit .env with real values (never commit .env)
npm run dev              # starts Express on http://localhost:3001
```

Health check: open <http://localhost:3001/health> — it should return `{"status":"ok"}`.

Lint the backend: `npm run lint`

## Run the frontend

```powershell
cd frontend
npm install
copy .env.example .env   # then edit .env with real values (never commit .env)
npm run dev              # starts Vite dev server on http://localhost:5173
```

Build for production: `npm run build` (type-checks with `tsc`, then bundles).
Lint the frontend: `npm run lint`

## Environment variables

- `backend/.env.example` — `PORT` (Express port, default 3001)
- `frontend/.env.example` — `VITE_API_URL` (backend base URL, default `http://localhost:3001`)

Copy each `.env.example` to `.env` and fill in real values locally. `.env` files are git-ignored; only placeholders live in `.env.example`.

## Status

PROM-11 (project structure) — in progress. No features implemented yet: no timer, no login, no video.
