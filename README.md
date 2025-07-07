# Weanime – Liquid Glass Anime Streaming Platform

Scaffolding generated 2025-07-05.  
This repo is organised as **two deployable apps**:

| Folder | Stack | Deploy target |
|--------|-------|---------------|
| `frontend/` | Next.js 15 + Tailwind | Netlify |
| `backend/`  | Node.js 20 LTS + Express + Supabase SDK | Railway |

Each app is self‑contained; environment variables are loaded from `.env`.  
A shared `docs/` folder holds incremental markdown history for AI assistants.

---

## Quick start (local)

```bash
# 1. Frontend
cd frontend
pnpm install
pnpm dev      # http://localhost:3000

# 2. Backend in another terminal
cd ../backend
pnpm install
pnpm dev      # http://localhost:4000
```

