# MyNewBlog Production Readiness

## Deployment Target

Use Cloudflare Workers through `@opennextjs/cloudflare`.

Why:
- The app is not a static export: it uses route handlers, tRPC, Better Auth, Neon, and R2 writes.
- Next.js 16 supports adapters, but Cloudflare is still provider-specific rather than the plain `next start` path.
- OpenNext produces the Worker bundle in `.open-next/worker.js` and assets in `.open-next/assets`.

References:
- OpenNext Cloudflare: https://opennext.js.org/cloudflare/get-started
- Cloudflare Next.js guide: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- Next.js deployment docs: `node_modules/next/dist/docs/01-app/01-getting-started/17-deploying.md`
- Next.js environment docs: `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`

## Added Project Hooks

- `wrangler.jsonc`: Cloudflare Worker target for OpenNext output.
- `.github/workflows/cloudflare.yml`: manual GitHub Actions workflow for Linux CI verification and optional Cloudflare deploy.
- `bun run build:cloudflare`: build the Worker output.
- `bun run preview:cloudflare`: build and preview in the Cloudflare workerd runtime.
- `bun run deploy:cloudflare`: build and deploy with Wrangler.
- `bun run upload:cloudflare`: build and upload without immediate release.
- `bun run cf:typegen`: generate Cloudflare env binding types if bindings are added later.
- `bun run check:prod-env`: validate production environment shape without printing secrets.

## Required Environment

Do not commit real values. Set them in local `.env` for development and in Cloudflare/CI secrets for deployment.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon Postgres URL. Prefer `sslmode=require`. |
| `BETTER_AUTH_SECRET` | yes | Long random secret, at least 32 characters. |
| `BETTER_AUTH_URL` | yes | Production origin: `https://tong777.ccwu.cc`. |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | yes | Same production origin: `https://tong777.ccwu.cc`; this is baked into the client bundle at build time. |
| `STUDIO_INVITE_CODE` | yes | Private Studio gate code. |
| `R2_ACCOUNT_ID` | yes unless `R2_ENDPOINT` is set | Used to derive the R2 S3 endpoint. |
| `R2_ENDPOINT` | optional | Explicit R2 S3 endpoint override. |
| `R2_ACCESS_KEY_ID` | yes | R2 S3 access key, not the Cloudflare API token. |
| `R2_SECRET_ACCESS_KEY` | yes | R2 S3 secret, not the Cloudflare API token. |
| `R2_BUCKET` | yes | Media bucket used by uploads and downloads. |
| `R2_PUBLIC_BASE_URL` | yes | Public/custom domain base URL for images and media. |
| `CLOUDFLARE_API_TOKEN` | deploy-time | Needed for non-interactive Wrangler deploys. |

## Preflight Commands

Run these before a production preview:

```powershell
bun run check:prod-env
bunx tsc --noEmit
bun run lint
bun run build
bun run build:cloudflare
```

## GitHub Actions Deployment

The primary production build path is `.github/workflows/cloudflare.yml`.

The workflow pins Bun to `1.2.21`, matching the current local toolchain.

Use it from GitHub:

1. Open Actions -> Cloudflare.
2. Run workflow.
3. Leave `deploy` unchecked for a build-only Linux CI verification.
4. Check `deploy` only when the Cloudflare Worker should be published.

Required GitHub Secrets:

| Secret | Notes |
| --- | --- |
| `DATABASE_URL` | Neon production connection string. |
| `BETTER_AUTH_SECRET` | Better Auth signing secret. |
| `STUDIO_INVITE_CODE` | Studio invite gate code. |
| `R2_ACCOUNT_ID` | Needed unless `R2_ENDPOINT` is used. |
| `R2_ENDPOINT` | Optional explicit R2 endpoint. |
| `R2_ACCESS_KEY_ID` | R2 S3 access key. |
| `R2_SECRET_ACCESS_KEY` | R2 S3 secret access key. |
| `R2_BUCKET` | R2 bucket name. |
| `R2_PUBLIC_BASE_URL` | Public/custom R2 media base URL. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account for Wrangler. |
| `CLOUDFLARE_API_TOKEN` | Required only when `deploy` is checked. |

The workflow hardcodes the production origin as `https://tong777.ccwu.cc` for both `BETTER_AUTH_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL`.

When `deploy` is checked, the workflow writes the app runtime secrets into a temporary `.cloudflare-secrets.json` file and deploys with:

```bash
bunx wrangler deploy --secrets-file .cloudflare-secrets.json
```

This lets GitHub Secrets be the single source for the first deploy. The temporary file exists only inside the GitHub Actions runner.

For Cloudflare runtime preview:

```powershell
bun run preview:cloudflare
```

For deployment:

```powershell
bun run deploy:cloudflare
```

## Database Checklist

- `drizzle.config.ts` reads `DATABASE_URL`.
- `src/db/index.ts` falls back to `drizzle.mock` when `DATABASE_URL` is missing; production must not rely on this fallback.
- Before deploy, run:

```powershell
bun run db:generate
bun run db:migrate
```

- Confirm the production Neon branch has tables for posts, comments, auth, media, and music.

## Auth Checklist

- `BETTER_AUTH_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL` must match the deployed origin.
- `NEXT_PUBLIC_BETTER_AUTH_URL` is build-time public config; rebuild when changing it.
- `BETTER_AUTH_SECRET` must not use the development fallback.
- Studio access requires both Better Auth session and invite cookie.

## R2 Checklist

- R2 media uses S3-compatible credentials through `src/lib/r2.ts`.
- `R2_PUBLIC_BASE_URL` should point to a public R2/custom domain so stored media can render without signed previews.
- Upload path currently supports `covers`, `gallery`, `attachments`, and `music`.
- Direct route upload size is capped at 25 MB.
- Deletion only removes the R2 object when the stored bucket matches the current configured bucket.
- `wrangler.jsonc` intentionally does not add a Worker R2 bucket binding yet, because the app currently uses the S3 client path.

## Cloudflare Checklist

- `@opennextjs/cloudflare` and `wrangler` are devDependencies.
- `wrangler.jsonc` uses:
  - `main = .open-next/worker.js`
  - `assets.directory = .open-next/assets`
  - `nodejs_compat`
  - `global_fetch_strictly_public`
  - `WORKER_SELF_REFERENCE` service binding
- Build-time public variables must be present before running `bun run build:cloudflare`:
  - `NEXT_PUBLIC_BETTER_AUTH_URL`

- GitHub Actions deploy syncs runtime secrets from GitHub Secrets with `wrangler deploy --secrets-file`.
- If deploying manually outside GitHub Actions, set Cloudflare runtime secrets first. At minimum:

```powershell
wrangler secret put DATABASE_URL
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put BETTER_AUTH_URL
wrangler secret put STUDIO_INVITE_CODE
wrangler secret put R2_ACCOUNT_ID
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
wrangler secret put R2_BUCKET
wrangler secret put R2_PUBLIC_BASE_URL
```

If `R2_ENDPOINT` is used instead of `R2_ACCOUNT_ID`, set that secret too.

## First Smoke Test List

After `preview:cloudflare` or deploy:

- `/` renders in light and dark mode.
- `/studio` blocks unauthenticated access.
- Studio invite accepts the configured invite code.
- Auth login/session survives refresh.
- Post list and post detail pages read from Neon.
- R2 media upload creates an object and records it in Neon.
- Public comments submit and Studio comments list/moderation works.
- Music page loads in background mode but remains bugfix-only.

## Known Risks

- No automated route smoke test exists yet.
- Cloudflare build reaches the OpenNext bundling stage on Windows, but currently fails on symlink creation:
  - `EPERM: operation not permitted, symlink ... node_modules/@aws-sdk/client-s3`
  - Retrying with elevated permissions produced the same error.
  - OpenNext also warns that Windows is not fully supported.
  - Next action: run the GitHub Actions `Cloudflare` workflow on Linux CI.
- Cloudflare preview/deploy has not been run yet because Worker bundle generation is blocked on Windows symlink handling and the Linux CI workflow still needs its first run.
- `NEXT_PUBLIC_BETTER_AUTH_URL` being build-time config means CI/CD must build with the final production origin.

## Current Verification Notes

- `bun run check:prod-env` passes required-value checks with warnings:
  - `CLOUDFLARE_API_TOKEN` is not set.
- `bunx tsc --noEmit` passes.
- `bun run lint` passes.
- `bun run build` passes.
- `bun run build:cloudflare` currently fails on Windows symlink creation during OpenNext trace copying.
- GitHub Actions workflow has been added but not run yet.
