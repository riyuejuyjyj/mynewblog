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
1. Push the two current local commits after confirming the remote if the safety layer asks again:
   - `c9a7cbb style(posts): refine mobile prose and reply threads`
   - `1a870cf style(studio): refine admin console layout`
2. Run a focused Studio mobile QA pass on `/studio` at 390px, 768px, and desktop widths.
3. Tighten the remaining Studio boards after the shell/dashboard pass: posts, comments, media, and editor.
4. Resume production readiness after the Studio publishing/moderation flow is comfortable enough for daily use.

## Next Optimization Plan: 2026-06-10

### P0: Commit/Push Follow-Through
- [x] Confirm and push the two local commits to `origin/main`.
- [x] Treat commit + push as the default finish step for future coding work, unless the user says not to push or the safety layer requires explicit remote confirmation.
- [ ] Keep the standard verification gate before each push: `bunx tsc --noEmit`, `bun run lint`, `bun run build`.

### P1: Studio Mobile Admin Pass
- [x] Tighten `StudioGate` auth/invite screens so the first `/studio` screen is not presentation-heavy on mobile.
- [ ] Verify the new mobile Studio shell with an authenticated session, not only the auth gate.
- [ ] Check no top-bar action, tab label, badge, or stats cell wraps awkwardly at 360-430px.
- [x] Reduce oversized mobile spacing in `posts-board.tsx`, `comments-board.tsx`, `media-board.tsx`, and key editor panels.
- [ ] Make repeated admin controls feel like a dense work surface: compact headers, stable button sizes, no nested card feel.

### P2: Publishing Workflow
- [x] Strengthen publish states in Studio with clear readiness feedback.
- [x] Tighten slug, title, cover, excerpt, reading time, featured, and published validation.
- [x] Add Markdown editor autosave with visible save status and unload protection.
- [ ] Improve Markdown editor ergonomics on mobile: metadata editing, preview switching, and upload flow.
- [ ] Continue splitting large editor logic only where it reduces real complexity.

### P3: Comments And Replies
- [x] Make Studio comments reflect the public threaded model: parent/reply context, status filters, counts, and safe delete.
- [x] Add a Studio reply path for author replies from the backend.
- [x] Add basic anti-spam/error handling before production exposure.
- [x] Keep public copy as "评论" and "回复"; avoid "回声/回响" wording.

### P4: Media/R2 Reliability
- [ ] Smoke test signed upload, server fallback upload, object preview URL, public URL resolution, and delete behavior.
- [ ] Add clear empty/error states for unconfigured R2, failed previews, and missing object keys.
- [ ] Check image fields used by posts and Markdown preview resolve consistently through `resolveStorageObjectUrl`.

### P5: Production Readiness
- [ ] Re-run the Cloudflare/OpenNext path from Linux/GitHub Actions after the Studio flow is stable.
- [ ] Recheck environment readiness for Neon, Better Auth, R2, and Cloudflare secrets.
- [ ] Smoke test `/`, `/posts`, `/posts/[slug]`, `/studio`, auth, comments, media upload, and music background playback.
- [ ] Update the deploy/runbook note with final env vars, migration command, verification commands, and rollback notes.

## Decisions Made
- Music player work is paused as a feature track and moved to bugfix-only.
- The next mainline is production readiness plus blog/Studio publishing, not deeper playback instrumentation.
- Cloudflare deployment target is Workers via `@opennextjs/cloudflare`, not a static export and not plain `next start`.
- GitHub Actions is the preferred production build/deploy path because it uses Linux CI and avoids the current Windows symlink blocker.
- GitHub `origin/main` push is now the normal deployment trigger; pushing to GitHub starts the Cloudflare deployment path.

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
Currently continuing the 2026-06-10 optimization plan: Studio comments now expose status filters, parent/reply context, author replies from Studio, and lightweight spam marking for public submissions. Next is authenticated visual QA and then the publishing/R2 reliability path.

## Next Pass: 2026-06-11

### P0: Authenticated Studio QA
- [ ] Open `/studio` with a real authenticated session and verify `dashboard`, `posts`, `editor`, `media`, and `comments` at mobile, tablet, and desktop widths.
- [ ] Confirm the new compact Studio shell still keeps top-bar actions, stats, and tab switching readable once the user is signed in.
- [ ] Check that comment moderation actions, reply flow, and post switching still feel dense and usable after the recent layout tightening.

### P1: R2 Media And Publishing Smoke Test
- [ ] Verify the new media/upload guardrails end to end: signed upload, direct-upload fallback, proxy preview URL, public URL, and delete cleanup.
- [ ] Test the cover-image path from Media board or Publish dialog through post save/publish, then confirm the saved post card and detail page resolve the image consistently.
- [ ] Validate the broken/missing asset states in `media-board.tsx` using at least one proxy-only asset and one intentionally missing object record.

### P2: Verification And Ship
- [x] `bunx tsc --noEmit`
- [x] `bun run lint`
- [x] `bun run build`
- [x] Run a live `/studio` route smoke test after the build gate passes.
- [x] Commit the current Studio media/editor reliability pass and push `origin/main`.

### P3: Complexity Reduction After Smoke Test
- [ ] Split `markdown-editor.tsx` by extracting publish-dialog state and media-upload helpers before adding more editor features.
- [ ] Trim `studio-experience.tsx` into smaller view-specific hooks/helpers so upload, auth/invite, and board orchestration stop growing in one file.
- [ ] Only resume broader production-readiness and Cloudflare follow-through after the authenticated Studio workflow is comfortable for daily use.
