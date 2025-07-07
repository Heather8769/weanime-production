# Weanime Backend (Express)

## Local dev
```bash
cp .env.sample .env
pnpm install
pnpm dev
```

## Railway deployment
1. Push repo to GitHub.
2. In Railway dashboard → "New Project" → "Deploy from GitHub".
3. Set environment variables from **.env sample**.
4. Under `Settings → Start Command` use `pnpm start`.
5. Attach PostgreSQL if you want an internal DB besides Supabase.

Railway will build TypeScript → JavaScript via the `build` script.
