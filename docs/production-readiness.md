# MyNewBlog Production Readiness

## Deployment Target

Use Cloudflare Workers through `@opennextjs/cloudflare`.

Why:
- The app is not a static export: it uses route handlers, tRPC, Better Auth, Neon, and R2 writes.
- Next.js 16 supports adapters, but Cloudflare is still provider-specific rather than the plain `next start` path.
- OpenNext produces the Worker bundle in `.open-next/worker.js` and assets in `.open-next/assets`.
- Cloudflare scripts force `next build --webpack` before OpenNext because the Windows/Turbopack OpenNext output can deploy a Worker that fails to load server chunks at runtime.

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
| `BETTER_AUTH_URL` | yes | Canonical production origin: `https://tong777.ccwu.cc`. |
| `BETTER_AUTH_TRUSTED_ORIGINS` | optional | Comma-separated extra auth origins for temporary preview domains. The current Worker URL is already allowlisted in code. |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | optional | Legacy fallback only; browser auth requests use the current same-origin host. |
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

Pushes to `main` or `master` run verification and deploy automatically.

For manual runs:

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
| `CLOUDFLARE_API_TOKEN` | Required for automatic push deploys and manual deploy runs. |

The workflow hardcodes the canonical production origin as `https://tong777.ccwu.cc` for `BETTER_AUTH_URL`. Browser auth calls resolve against the current same-origin host at runtime, which prevents `workers.dev` from calling `tong777.ccwu.cc` as a cross-origin auth API.

On push, or when manual `deploy` is checked, the workflow writes the app runtime secrets into a temporary `.cloudflare-secrets.json` file and deploys with:

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

- `BETTER_AUTH_URL` should point to the canonical production origin.
- Better Auth uses dynamic allowed hosts for `tong777.ccwu.cc`, `mynewblog.2556419331.workers.dev`, and local development hosts.
- Add extra preview origins to `BETTER_AUTH_TRUSTED_ORIGINS` when testing from additional hostnames.
- `BETTER_AUTH_SECRET` must not use the development fallback.
- Studio access requires both Better Auth session and invite cookie.

## R2 Checklist

- R2 media uses S3-compatible credentials through `src/lib/r2.ts`.
- `src/lib/r2.ts` intentionally uses a lightweight SigV4/fetch implementation instead of `@aws-sdk/client-s3` to keep the Cloudflare Worker bundle smaller.
- `R2_PUBLIC_BASE_URL` should point to a public R2/custom domain so stored media can render without signed previews.
- Upload path currently supports `covers`, `gallery`, `attachments`, and `music`.
- Direct route upload size is capped at 25 MB.
- Deletion only removes the R2 object when the stored bucket matches the current configured bucket.
- `wrangler.jsonc` intentionally does not add a Worker R2 bucket binding yet, because the app currently uses the S3 client path.

## Music Deployment Mode

Music remains bugfix-only for production launch.

- Server-side remote MusicFree plugin execution is disabled in the Cloudflare bundle to reduce Worker size.
- Server-side LX/local source script execution is disabled in the Cloudflare bundle because it depends on local files and `node:vm`.
- Existing manual tracks and stored/downloaded audio URLs can still be used.
- Search/resolve endpoints for remote music plugins return empty results or a clear disabled error.

## Cloudflare Checklist

- `@opennextjs/cloudflare` and `wrangler` are devDependencies.
- `wrangler.jsonc` uses:
  - `main = .open-next/worker.js`
  - `assets.directory = .open-next/assets`
  - `nodejs_compat`
  - `global_fetch_strictly_public`
  - `WORKER_SELF_REFERENCE` service binding
  - `workers_dev = true`
  - `preview_urls = true`
  - `routes` for `tong777.ccwu.cc/*` are intentionally commented until the Cloudflare API token can read and edit Worker routes on the `tong777.ccwu.cc` zone.

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

If deploying to an additional preview hostname, set `BETTER_AUTH_TRUSTED_ORIGINS` to a comma-separated list of those full origins before deploy.

## First Smoke Test List

After `preview:cloudflare` or deploy:

- `/` renders in light and dark mode.
- `/studio` blocks unauthenticated access.
- Studio invite accepts the configured invite code.
- Auth login/session survives refresh.
- Post list and post detail pages read from Neon.
- R2 media upload creates an object and records it in Neon.
- Downloaded music streams through the same-origin `/api/music/download?mode=stream` route and file downloads use `/api/music/download?id=...`.
- Public comments submit and Studio comments list/moderation works.
- Music page loads in background mode but remains bugfix-only.

## Known Risks

- No automated route smoke test exists yet.
- First GitHub Actions Linux deploy failed Cloudflare validation because the Worker exceeded the Free plan 3 MiB script size limit:
  - Cloudflare reported `.open-next/server-functions/default/handler.mjs` at about 16 MiB.
  - Cloudflare Workers Paid raises the Worker size limit to 10 MiB, but the app should still be slimmed before relying on that.
  - First reduction pass removed app-level AWS SDK R2 dependencies and replaced them with lightweight SigV4/fetch signing.
  - Second reduction pass disabled server-side music plugin/LX script execution and removed the corresponding heavy runtime dependencies.
- OpenNext warns that Windows is not fully supported.
- A local Windows/Turbopack deploy uploaded successfully but returned live `ChunkLoadError` for a missing server chunk; keep Cloudflare scripts on `next build --webpack`.
- `tong777.ccwu.cc` exists as its own active Cloudflare zone in this account. The route must use `zone_name = "tong777.ccwu.cc"`, not `ccwu.cc`.
- The current API token can see the `tong777.ccwu.cc` zone but receives `403 Authentication error` for `/zones/<zone_id>/workers/routes`. Add Zone -> Workers Routes read/edit permission for that zone, then enable the commented route in `wrangler.jsonc`.

## Current Verification Notes

- `bun run check:prod-env` passes required-value checks with warnings:
  - `CLOUDFLARE_API_TOKEN` is not set.
- `bunx tsc --noEmit` passes.
- `bun run lint` passes.
- `bun run build` passes.
- `bun run build:cloudflare` passes locally with `next build --webpack`.
- `bunx wrangler deploy --dry-run` reads the generated Worker/assets successfully; the sandbox blocks only Wrangler's user-directory debug log write.
- GitHub Actions workflow deploys automatically on push to `main` or `master`; manual workflow dispatch can still be used for verify-only runs.
