# Dev Log

## 2026-04-15 (Production Launch Verification)

### Summary
Full production readiness pass: dead code removal, UX integrity fixes, Cloudflare Worker deployment with correct secrets, and a fully automated end-to-end pipeline test. All MVP blockers resolved.

### Completed Today

**Dead code cleanup**
- Removed `app/page.tsx` — App Router stub at `/` that was conflicting with `pages/index.tsx` (Pages Router). This was breaking the build silently in deployment.
- Removed `app/api/approve.ts` and `app/api/deny.ts` — legacy Pages Router syntax files that had drifted into the App Router directory.
- Removed orphaned `components/UploadButton.tsx`, `lib/uploadPhoto.ts`, `lib/supabase-browser.ts` — all only used by the deleted App Router stub.

**UX integrity**
- `pages/sendyourphotos.tsx` — removed raw Supabase config error messages that were surfacing to guests when env vars weren't available. Replaced with `FeatureToast` ("Photo uploads are not available yet...").
- `pages/guestbook.tsx` — same dev error removed, replaced with FeatureToast.

**Style**
- `pages/contact.tsx` — fully palette-styled. Removed RSVP framing, shows contact placeholder.
- `pages/registry.tsx` — fully palette-styled. "Your presence is the greatest gift" copy, registry links notice.

**Worker deployment**
- Discovered the live Worker URL (`https://worker.therealmccoyster.workers.dev`) was returning `Hello World!` — the Cloudflare template placeholder, not real code.
- Root cause: Cloudflare dashboard had plaintext vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`) that blocked `wrangler secret put` from running.
- Fix: ran `wrangler deploy` (which wiped the plaintext vars), then immediately set all three as encrypted secrets via `wrangler secret put`.
- Verified production runtime: `GET /health` → `{"ok":true,"url":true,"key":true}`.

**Endpoint smoke tests (all passed)**
- `GET /health` → `{"ok":true,"url":true,"key":true}`
- `GET /photos/approved` → 200, empty array (no approved photos yet)
- `GET /guestbook/approved` → 200, empty array
- `GET /photos/pending` (with `Authorization: Bearer`) → 200, pending list
- `GET /admin/stats` (authed) → 200, stats object
- `GET /photos/pending` (no auth) → 401

**Automated end-to-end pipeline test**
All 6 steps via `supabase/pipeline_test.py` (gitignored):
1. Upload test photo to Supabase Storage (`uploads/<uuid>.jpg`) ✅
2. Insert `photos` row (`status=pending`, `is_visible=false`) ✅
3. Verify photo appears in Worker `/photos/pending` ✅
4. Approve via Worker `POST /photos/approve` → file moved `uploads/` → `approved/`, DB updated ✅
5. Verify photo appears in Worker `/photos/approved` with signed URL ✅
6. Reject/cleanup — photo removed from DB and storage ✅

**Environment**
- `.env` fully populated: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_WORKER_BASE_URL`, `NEXT_PUBLIC_WEDDING_SLUG=john-crystal-2026`, `SUPABASE_SERVICE_ROLE_KEY`
- All Vercel env vars set by client

**Artifacts**
- Added `supabase/setup-live.sql` — idempotent one-shot script for tables, RLS, storage bucket. Tracked in git for reference.
- Added `supabase/pipeline_test.py` to `.gitignore` (test artifact, not needed in repo)
- Created `supabase/setup-live.sql` for onboarding/recovery reference.

### Build Validation
```
npm run build   # ✅ clean — 15 routes, all static
```

### Remaining (post-launch)
- Set `ADMIN_ORIGIN` Worker secret to production domain for strict CORS
- Consider moving `/admin` to unguessable path or adding Cloudflare Access
- `POST /mark-reviewed` route (optional operational aid)

---

## 2026-03-03 (Build Verification + UI Lock)

### Summary
Ran a full verification sweep and switched the site into full-functionality refinement mode by enabling the root homepage and locking the bride-selected palette.

### Completed Today
- Verified full quality gate:
  - `npm --prefix worker run test -- --run`
  - `npm test -- --runInBand`
  - `npm run build`
- Disabled Under Construction as default homepage:
  - `pages/index.tsx` now renders a functional home hub
  - `pages/_app.tsx` now hides nav only on `/under-construction`
- Locked palette to bride-selected `petty-shop`:
  - disabled runtime palette switching in `context/PaletteContext.tsx`
  - removed toggle surface from `pages/demo.tsx`

### Notes
- This state is intended to support rapid visual/style iteration against the final chosen palette.
- Under-construction route is still available as a fallback page if needed.

## 2026-03-03

### Summary
Completed moderation/public-read wiring for gallery + guestbook, expanded test coverage, and fixed a Vercel deployment blocker caused by TypeScript project boundary bleed-through.

### Completed Today
- Added public Worker read routes for approved content:
  - `GET /photos/approved`
  - `GET /guestbook/approved`
- Wired public pages to Worker-approved reads:
  - `pages/gallery.tsx`
  - `pages/guestbook.tsx`
- Kept safe local fallback behavior when `NEXT_PUBLIC_WORKER_BASE_URL` is not set.
- Upgraded admin moderation UI and auth modal flow:
  - protected Worker route usage
  - password prompt fallback
  - three-failure lockout redirect behavior
- Added photo label model support:
  - `label_raw` + `label_slug`
  - migration `supabase/migrations/20260302161500_add_photo_labels.sql`
- Added/expanded tests:
  - Worker route tests (`worker/test/index.spec.ts`)
  - Page tests (`__tests__/pages/*`)
  - Jest config and setup files

### Deployment Fix
- Root cause: Vercel Next build attempted to type-check Worker config (`worker/vitest.config.mts`).
- Fix: harden root `tsconfig.json` boundary so root app excludes Worker project files.
  - remove broad `**/*.mts` include
  - exclude `worker` and `worker/**`

### Validation
- `npm --prefix worker run test -- --run` passes.
- `npm test -- --runInBand` passes.
- `npm run build` passes.

### Notes
- Worker and Next app are intentionally separate TypeScript surfaces and should stay isolated for CI/CD reliability.

## 2026-02-24

### Summary
Prepared the wedding site for near-term placeholder deployment while improving readability/accessibility and replacing stock visuals with couple-specific photos.

### Completed Today
- Replaced landing placeholder image with `happycouple.jpg`.
- Added `glassespic.jpg` to the About page intro.
- Updated About page with real His / Hers / Ours content from couple notes.
- Switched live root (`/`) to in-progress landing mode.
- Hid global nav on in-progress routes (`/` and `/under-construction`) to avoid exposing unfinished flows from landing page.
- Improved placeholder messaging on contact/registry/event details.
- Added explicit “not implemented yet” feedback for non-live form actions.
- Improved accessibility/readability for older guests:
  - Larger base typography
  - Stronger focus visibility
  - Reduced visual background noise
  - Larger tap targets and spacing (“fat-finger” friendly controls)
- Set red racing palette (`petty-shop`) as default and adjusted red card tone for improved readability contrast.

### Build / Validation
- `npm run build` passes successfully after today’s changes.
- Routes are statically generated as expected.

### Tree Review (Current Working Tree Snapshot)
Repository contains substantial in-progress work beyond today’s changes:
- Existing modified files in `pages/`, `components/`, and `docs/`.
- New/untracked app foundation files and style files under `styles/`, `context/`, `lib/`, and `components/`.
- New assets in `public/photos/` including couple photos.

This means the next commit should be **scoped intentionally** (stage only files for the deployment-focused pass) rather than committing the entire working tree.

### Files Touched in This Pass
- `pages/under-construction.tsx`
- `pages/about.tsx`
- `styles/pages/about.css`
- (Earlier in same deployment-prep sequence) `pages/index.tsx`, `pages/_app.tsx`, accessibility-related style files, and placeholder form messaging files.

### Recommended Commit Message
`feat(site): prep live placeholder launch with couple content, real photos, and accessibility-first tap targets`

### Optional Commit Body
- switch `/` to in-progress landing and hide nav on in-progress routes
- replace stock landing image with `happycouple.jpg` and add `glassespic.jpg` on About
- replace About stubs with couple-provided His/Hers/Ours story content
- improve readability and accessibility (larger type, stronger focus states, larger hit targets)
- align placeholder UX with clear “not yet implemented” feedback for non-live forms
