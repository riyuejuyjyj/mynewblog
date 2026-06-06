# MyNewBlog

Personal bilingual blog and Studio system built with Next.js, tRPC, TanStack Query, Drizzle, Neon, Better Auth, shadcn/ui, and Cloudflare R2.

## Local Development

```powershell
bun install
bun run dev
```

Open `http://localhost:3000`.

## Core Scripts

```powershell
bunx tsc --noEmit
bun run lint
bun run build
```

Database:

```powershell
bun run db:generate
bun run db:migrate
bun run db:studio
```

Cloudflare/OpenNext:

```powershell
bun run check:prod-env
bun run build:cloudflare
bun run preview:cloudflare
bun run deploy:cloudflare
```

## Cloudflare CI/CD

Production Cloudflare builds should run from the manual GitHub Actions workflow at `.github/workflows/cloudflare.yml`.

- Run with `deploy` unchecked to verify the Linux OpenNext build.
- Run with `deploy` checked to publish to Cloudflare after GitHub Secrets and Cloudflare Worker runtime secrets are configured.

## Production Readiness

See [docs/production-readiness.md](docs/production-readiness.md) for the current Cloudflare Workers deployment path, required environment variables, R2 checks, auth checks, and smoke-test list.

## Notes

- Do not commit real `.env` files or secrets.
- Music playback is currently bugfix-only; production readiness and blog/Studio publishing are the mainline work.
