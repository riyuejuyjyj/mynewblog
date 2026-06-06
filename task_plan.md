# Task Plan: MyNewBlog Roadmap

## Goal
Ship MyNewBlog as a usable bilingual personal blog and Studio system, with Cloudflare/R2/Neon production readiness, while putting the music player into bugfix-only mode.

## Working Rules
- Music is now bugfix-only. Do not add new player features unless a concrete reproduction, diagnostic event, or user-visible blocker justifies it.
- Keep the current stack: Next.js, tRPC, TanStack Query, Drizzle, Neon, Better Auth, shadcn/ui, R2.
- Prefer production blockers over polish when priorities conflict.
- Keep credentials out of chat and committed files.

## Phases
- [x] Phase 1: Stabilize the current baseline
  - Run the standard verification gate after the recent music changes.
  - Record known remaining blockers instead of continuing open-ended player tuning.
  - Confirm no obvious route/build/auth regression was introduced.

- [ ] Phase 2: Production and deployment readiness
  - [x] Add an environment/config readiness checklist for Neon, Better Auth, R2, and Cloudflare.
  - [x] Add Cloudflare/OpenNext adapter dependencies, scripts, and Wrangler configuration.
  - [x] Add a manual GitHub Actions workflow for Linux Cloudflare build verification and optional deploy.
  - [x] Verify Drizzle migrations and deployment commands are documented.
  - Confirm R2 public URLs, preview URLs, upload signing, and delete behavior work consistently.
  - Prepare the Cloudflare deployment path without changing the app stack.

- [ ] Phase 3: Blog publishing workflow
  - Finish post create/edit/delete/publish flow in Studio.
  - Tighten slug, draft, featured, cover, gallery, and Markdown preview behavior.
  - Continue modularizing the writing area so editor logic does not become one giant TSX file.
  - Fix remaining `img src=""` and theme initialization warnings where they affect real use.

- [ ] Phase 4: Comments and moderation
  - Verify public comment submission, validation, and status flow.
  - Make Studio moderation reliable for approve/delete/list states.
  - Add sensible spam/rate-limit/error handling before production exposure.

- [ ] Phase 5: UX and content polish
  - Finalize bilingual copy and language switching across public pages and Studio.
  - Check dark/light mode consistency.
  - Polish responsive layout, loading animation, dynamic background, hover/scroll motion, and Studio navigation.
  - Keep the visual direction personal and atmospheric without turning the first screen into a marketing landing page.

- [ ] Phase 6: Release checklist
  - Run `bunx tsc --noEmit`, `bun run lint`, and `bun run build`.
  - Smoke test core routes: `/`, `/studio`, post detail pages, auth, R2 upload, comments, and music background playback.
  - Write a short deploy/runbook note covering env vars, migrations, and rollback.

## Immediate Next Actions
1. Push the server-side music plugin/LX script reduction patch and rerun the `Cloudflare` workflow with `deploy` checked.
2. If Cloudflare still rejects the Worker at the Free plan 3 MiB limit, treat Workers Paid as the likely deployment requirement for this Next/OpenNext SSR app.
3. Verify the first deployed Worker URL, then bind/verify the production domain `https://tong777.ccwu.cc`.
4. Resume the highest-impact Studio publishing and media blockers after the deployment path is unblocked.

## Decisions Made
- Music player work is paused as a feature track and moved to bugfix-only.
- The next mainline is production readiness plus blog/Studio publishing, not deeper playback instrumentation.
- Cloudflare deployment target is Workers via `@opennextjs/cloudflare`, not a static export and not plain `next start`.
- GitHub Actions is the preferred production build/deploy path because it uses Linux CI and avoids the current Windows symlink blocker.

## Errors Encountered
- `bun run build:cloudflare` reaches OpenNext bundling but fails on Windows symlink creation for traced `node_modules` packages (`EPERM: operation not permitted, symlink ... @aws-sdk/client-s3`). Retrying with elevated permissions produced the same error. Treat this as an environment blocker and rerun from WSL/Linux CI.
- `bun run lint` initially scanned generated `.open-next/` output after the failed Cloudflare build. Fixed by adding `.open-next/**` and `.wrangler/**` to `eslint.config.mjs` global ignores and `.gitignore`.
- `bun run check:prod-env` warns locally that `CLOUDFLARE_API_TOKEN` is not set. GitHub deploy requires `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` repository secrets.
- GitHub Actions Linux build verification passed, but first deploy failed Cloudflare validation because the Worker exceeded the Free plan 3 MiB script size limit. First mitigation: replace app-level AWS SDK R2 usage with a lightweight SigV4/fetch implementation.
- Second mitigation: disable server-side MusicFree plugin and LX/local source script execution for the Cloudflare production bundle and remove heavy plugin runtime dependencies.

## Open Questions
1. Which content flow matters first: public blog publishing or Studio admin ergonomics?
2. Should comments launch with manual approval only, or also basic anti-spam controls?

## Closed Questions
- Production domain is `https://tong777.ccwu.cc`; set both `BETTER_AUTH_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL` to this origin.
- Cloudflare build/deploy should run from GitHub Actions/Linux CI first. WSL remains useful for local reproduction, but it is no longer the main release path.

## Status
Currently in Phase 2: Cloudflare/OpenNext setup, production readiness documentation, and a manual GitHub Actions workflow are in place. Linux CI build verification passed; deploy exposed a Worker script size blocker, and the current patch removes heavy server-side music plugin execution before rerunning deploy.
