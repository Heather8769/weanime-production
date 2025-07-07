# Weanime Frontend (Next.js)

Uses the App Router with **Edge runtime**.

## Local dev
```bash
cp .env.local.example .env.local
pnpm install
pnpm dev
```

## Netlify deployment
1. Connect your Git repo → Netlify.
2. Build command: `pnpm exec next build`
3. Publish directory: `frontend/.next`
4. Add the following environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Enable `Netlify Edge Functions` (automatic).

Netlify will automatically detect Next.js and serve SSR pages.
