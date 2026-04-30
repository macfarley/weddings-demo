# Dev Log

## 2026-04-29

### Summary
Full platform migration from Supabase to Neon (PostgreSQL) + UploadThing (file storage). Motivated by a data-access incident with Supabase's free tier. All functionality preserved — guestbook, photo gallery, admin moderation, love reactions. Zero downtime migration completed in one session.

### What Changed

**Database — Supabase → Neon**
- Removed `@supabase/supabase-js` from all dependencies (root and worker)
- Installed `@neondatabase/serverless` (`^0.10.4` root, `^1.1.0` worker)
- `lib/supabase.ts` gutted — now exports only `getWeddingSlug()` (kept filename to avoid breaking imports in `pages/gallery.tsx` and tests)
- All direct Supabase client calls replaced with Neon tagged template SQL (`neon(DATABASE_URL)`)
- Error handling pattern changed from `{ data, error }` destructure → try/catch
- COUNT queries cast via `::text` and parsed with `parseInt(result[0].count, 10)`
- UUIDs cast explicitly with `::uuid` in parameterized queries

**File Storage — Supabase Storage → UploadThing (already migrated prior session, completed here)**
- `server/uploadthing.ts` rewired: `@supabase/supabase-js` → `@neondatabase/serverless`
- `getServiceClient()` replaced with `getDb()` (Neon client)
- `onUploadComplete` inserts photo metadata to Neon via parameterized SQL
- File references use `file.ufsUrl` (CDN URL) and `file.key` (stored as `storage_path`)

**Guestbook — browser Supabase client → server-side API route**
- Created `pages/api/guestbook.ts`: server-only POST handler, Neon insert, full input validation, `is_visible=false` default
- `pages/guestbook.tsx`: `handleSubmit` changed from direct Supabase insert to `fetch('/api/guestbook', { method: 'POST', ... })`

**Worker (`worker/src/index.ts`) — full rewrite of all DB calls**
- `WorkerEnv` now has `DATABASE_URL` only (removed `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- All Supabase client calls replaced with Neon tagged template SQL with try/catch
- `GET /health` now checks `Boolean(env.DATABASE_URL)` → `{ ok, db }`
- Daily cron: replaced Supabase REST ping with `SELECT 1` keepalive
- `POST /photos/react`: replaced `.rpc('react_to_photo', ...)` with `SELECT react_to_photo(${id}::uuid, ${hash}) as love_count`
- All `Promise.all` type casts updated to `as unknown as Promise<T>` (required by Neon's `NeonQueryPromise` type)
- Cron string `0 10 * * 0` fixed to `0 10 * * SUN` (Cloudflare rejected numeric weekday `0`)

**Cleanup**
- Removed `supabase/` directory entirely (config.toml, migrations, pipeline_test.py, storage.ts, edge functions)
- Removed `@supabase/supabase-js` and `supabase` CLI from `package.json`
- Removed all `db:*` npm scripts (`db:start`, `db:stop`, `db:reset`, `db:push`, `db:pull`, `db:migration:new`)
- Updated `worker/package.json`: removed `@supabase/supabase-js`
- Updated `.env.example`: Supabase vars replaced with `DATABASE_URL` + `UPLOADTHING_TOKEN`

**Infrastructure**
- Neon project: `JohnCrystalMayWedding` (us-east-2, project ID `dawn-mode-48968592`)
- Schema reconstructed from git history and applied to Neon via `neon-schema.sql`
- `DATABASE_URL` written to `.env.local`, Vercel env vars, and Wrangler secret
- `UPLOADTHING_TOKEN` written to `.env.local` and Wrangler secret

**Tests**
- `guestbook-validation.test.tsx` rewritten: mocks `global.fetch`, tests POST to `/api/guestbook`, fixed assertions to `not.toHaveBeenCalledWith('/api/guestbook', ...)` (page does a load-time worker fetch on mount)
- `guestbook-upload.test.tsx` rewritten: single form submission test via fetch mock

### Build Validation
```
npx tsc --noEmit              # ✅ zero errors (Next.js app)
cd worker && npx tsc --noEmit # ✅ zero errors
npm test                      # ✅ 52/52 passing (8 suites)
wrangler deploy               # ✅ worker live at https://worker.therealmccoyster.workers.dev
```

### Worker Secrets (current production state)
- `DATABASE_URL` — Neon connection string ✅
- `UPLOADTHING_TOKEN` — UploadThing API token ✅
- `ADMIN_PASSWORD`, `CLIENT_PASSWORD`, `HF_TOKEN`, `SLACK_WEBHOOK_URL`, `ADMIN_ORIGIN`, `SITE_ORIGIN` — unchanged ✅

---

## 2026-04-18

### Summary
Visual identity overhaul — stoplight CTA theme, racetrack guestbook, QR code flyer, shared footer, and gallery emoji placeholders. Full test/build pass before deploy.

### Changes This Session

**Favicon + tab title**
- `pages/_document.tsx`: wedding cake emoji SVG data-URI favicon; `<title>John and Crystal May 4Ever</title>`

**Styles folder reorganization**
- Moved `styles/palette-picker.module.css` → `styles/components/palette-picker.module.css`
- Created `styles/pages/` and `styles/components/` subdirectory splits (CSS files were previously at the root of `styles/`)
- Updated imports in `gallery.tsx`, `guestbook.tsx`, and `PalettePicker.tsx`
- Added `types/styles.d.ts` CSS module declaration

**Guestbook — racetrack redesign**
- `pages/guestbook.tsx` + `styles/pages/guestbook.css`: full racetrack road layout with bride/groom lane columns, car-shaped message cards (bride-car / groom-car with color-coded top borders)
- Hero card: fade-to-transparent gradient effect; `↓ Sign the Guestbook` CTA anchor pill
- Form section: green "go" theme (`form-section--go`); semantic family name placeholder text

**Navbar — stoplight overhaul**
- `components/NavBar.tsx`: removed Home link; renamed all links ("Event Program", "About the Couple", "Photo Gallery", "Sign the Guestbook", "Send Your Photos")
- Each link gets a stoplight variant: `red`, `red`, `yellow`, `green`, `green`
- `styles/components/navbar.css`: `.nav-link--red/yellow/green` classes with glow effects

**Gallery — emoji wedding placeholders**
- `components/Gallery.tsx`: replaced 16-item stock-photo mock with 8 `emoji:` protocol tiles (👰🤵🎂💍❤️💒🥂🌸)
- Emoji tiles render as `role="presentation"` figures (not clickable, no love button)
- `styles/globals.css`: `.gallery-emoji-placeholder` tile CSS

**Forms — green "go" theme + semantic hint text**
- `pages/guestbook.tsx` + `pages/sendyourphotos.tsx`: `form-section--go` green border/tint on form sections
- Family name field placeholder changed to `"e.g. Uncle Tony, Nana Collins, Auntie Gina, Cousin Pookie"`

**QR Code Flyer — new page**
- `pages/qrcodeflyer.tsx`: printable venue flyer with `react-qr-code` pointing to `/sendyourphotos`
- Heart border (❤️ pseudo-elements), step row, SitesbyMac footer
- Auto-triggers `window.print()` on load (600ms delay)
- Print CSS: letter-size `@page`, `-webkit-print-color-adjust: exact`
- Flyer links added to `pages/index.tsx` and `pages/admin.tsx`

**Homepage — stoplight explore pills**
- `pages/index.tsx` + `styles/pages/index.css`: 2×2 card grid replaced with single-column vertical stoplight pill list (mirrors nav order and colors)
- `home-section` class for above-fold compact padding

**Shared SiteFooter**
- `components/SiteFooter.tsx`: "About the Creator" section with SitesbyMac.dev + contact email buttons
- Mounted in `pages/_app.tsx` (all routes except `/under-construction`)
- Removed duplicate "About the Creator" block from `pages/about.tsx`

**Tests**
- Fixed 7 broken placeholder-text assertions (`/last name or nickname/i` → `/uncle tony/i`) in `guestbook-validation.test.tsx` and `guestbook-upload.test.tsx`
- Fixed 2 broken gallery role assertions (`getAllByRole('button')` → `getAllByRole('presentation')`) in `gallery-worker.test.tsx` and `public-routes.test.tsx`
- Added `__tests__/pages/new-components.test.tsx` covering SiteFooter, NavBar variants, and QRCodeFlyer (11 new tests)

### Build Validation
```
npm test        # ✅ 28/28 passing (6 suites)
npm run build   # ✅ clean — 17 static routes
```

---



### Summary
Major UX polish pass, love-reactions feature shipped, gallery bug fixed, two-tier admin auth, auto-moderation, and full deployment push. All commits since the 2026-04-15 launch log.

### Commits This Session

**`32907ec` — fix: navbar hamburger, card backgrounds, gallery love reactions, nav routing**
- Navbar: desktop link buttons were overflowing the bar; buttons now shrink responsively, then collapse to hamburger at 1100px via `@media (max-width: 1100px)` (was never triggering before — `display: none` on `.navbar-links` was missing entirely)
- Gallery: `gallery-page-container` was overriding `section-full`'s solid white background with `rgba(255,255,255,0.15)` — bumped to `0.96`
- About page: `<main>` was filling with solid `palette.background`, blocking the checker BG image. Removed inline style; gave `.about-intro` a white card background
- Program page: same solid-main fix
- Guestbook (`/guestbook`): header text "Thanks for Visiting" was floating against the checker. Added white card backgrounds to `.guestbook-header`, `.guestbook-entries-section`, and `.guestbook-form-section`
- Photo-guestbook: same card treatment for `.photo-guestbook-header` and `.photo-guestbook-form-section`
- Home page: "Event Details" card was linking to `/event-details` (broken page). Now links to `/program`
- About hero image: shrunk from `26rem` → `19.5rem`, added `display: block` + auto margins for centered alignment
- Mobile: `section-full`, `gallery-section`, `page-header` all use `90vw` fluid container on ≤768px
- Gallery sort controls and love button CSS added
- Test: fixed `public-routes.test.tsx` gallery test to clear `NEXT_PUBLIC_WORKER_BASE_URL` before render (worker env var in test env caused fetch → failure → empty photos → no buttons rendered)

**`97caac7` — fix: automod fallback leaves photos pending (not auto-approved) when HF unavailable**
- `classifyNsfw()` previously returned `null` for any error/timeout, which was causing photos to fall through to auto-approve rather than stay in pending
- Corrected to only auto-approve when classifier explicitly returns `false` (confirmed safe)

**`4aba1e6` — feat: auto-moderate pending photos via HuggingFace NSFW classifier (every 2min)**
- Worker cron `*/2 * * * *` calls `autoModeratePending(env)` to classify new uploads
- Uses HuggingFace `Falconsai/nsfw_image_detection` model at 95% threshold
- Fails open (leaves as pending) if no `HF_TOKEN`, model loading, or network error
- Only confirmed NSFW → auto-trash; confirmed safe → auto-approve

**`3833263` — feat: daily Supabase keep-alive cron (9AM UTC)**
- Added `"0 9 * * *"` cron to `wrangler.jsonc` triggers
- Pings `GET /rest/v1/photos?select=id&limit=1` to prevent free-tier auto-pause (7-day idle timeout)

**`29ce340` — feat: two-tier auth — client can approve/trash, admin retains purge and hard-delete**
- Added `CLIENT_PASSWORD` Worker secret alongside `ADMIN_PASSWORD`
- `ADMIN_ONLY_ROUTES` set: `POST /photos/purge`, `POST /delete`, `POST /guestbook/delete`
- `CLIENT_ROUTES` set: approve, reject, pending lists, stats, role check
- `GET /auth/role` returns `"admin"` or `"client"` — used by the admin UI to conditionally show destructive controls
- Admin page (`pages/admin.tsx`) fetches role on load and hides purge/hard-delete for client-tier sessions

**`8bdacf9` — feat: gallery download uses signed URL with semantic filename**
- `download_url` is now `${signedUrl}&download=${slug}.jpg` where slug is derived from `original_filename` → ASCII-safe kebab-case
- `toDownloadSlug()` and `getFilename()` helpers added to Worker

**`d331360` — fix: consolidate all global CSS imports into _app.tsx**
- All `styles/pages/*.css` and `styles/components/*.css` moved to single import block in `pages/_app.tsx`
- Next.js forbids global CSS imports outside `_app.tsx` — this was causing intermittent build failures

**`fffb887` — fix: explicit cache headers**
- HTML responses: `Cache-Control: no-store, must-revalidate`
- Static assets: `Cache-Control: public, max-age=31536000, immutable`

**`6ffd337` — fix: image viewer**
- Fullscreen viewer no longer has inner scroll
- Closes on outside-tap (backdrop click)
- Close button always reachable regardless of image size

**`88d8858` — fix: full-width form card on mobile for /sendyourphotos**

**`0deff19` — docs: clean up README for client demo**

### Love Reactions Feature (shipped across multiple commits)
- `supabase/migrations/20260416120000_add_love_reactions.sql` — `love_count` int column on `photos`, `photo_reactions` table (photo_id + ip_hash PK), `react_to_photo(uuid, text)` atomic RPC
- Migration applied to production via Supabase Management API
- Worker `POST /photos/react` — hashes `<photo_id>:<ip>` with SHA-256, calls RPC, returns updated count. Public route (no auth required)
- Worker `listApprovedPhotos` now selects `love_count`; falls back gracefully if column missing (pre-migration)
- Gallery component: love button per photo, optimistic UI update, localStorage persistence of already-loved IDs, rollback on network failure
- Gallery page: sort toggle — "Newest First" / "❤️ Most Loved"

### Docs
- `docs/new-client-setup-guide.md` — full step-by-step guide for spinning up a new couple's site from this repo: fork, identity swap, Supabase project, Worker deploy, Vercel deploy, cron verification, end-to-end checklist

### Build Validation
```
npm test        # ✅ 6/6 passing
npm run build   # ✅ clean
wrangler deploy # ✅ worker live
```

### Database State (production)
- `photos` table: `love_count int not null default 0` column added
- `photo_reactions` table: created with `(photo_id, ip_hash)` primary key
- `react_to_photo(uuid, text)` RPC: live and verified

---



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

## 2026-04-27

### Summary
Addressed excessive Supabase egress and implemented security measures to prevent scrapers and bots. Optimized image delivery and caching while ensuring a frictionless user experience.

### Changes This Session

**Supabase Egress Optimization**
- Moved gallery images to `/public/photos` to reduce Supabase bandwidth usage.
- Updated image delivery to use optimized static assets.

**Security Enhancements**
- Added Next.js middleware (`/middleware.ts`) to block known bad user agents.
- Implemented origin allowlisting in Cloudflare Worker (`/worker/src/index.ts`) to block unauthorized API calls.
- Added honeypot field to `/pages/sendyourphotos.tsx` to deter bots.
- Updated `/public/robots.txt` to disallow crawlers.

**User Experience Improvements**
- Created `PrivacyNoticeBanner` component to inform users about site privacy.
- Updated Vercel caching rules for static assets to improve performance.

**Testing and Validation**
- Verified all changes with no errors.
- Confirmed functionality of middleware, Worker updates, honeypot field, and privacy banner.

## 2026-04-27

### Summary
Docs folder cleanup and updates — archived obsolete files, cleaned up styleguide, formatted credits, and updated new-client setup guide.

### Changes This Session

**Docs folder cleanup**
- Moved `docs/planning.md`, `docs/path-forward-stable-placeholder.md`, and `docs/collins-may-wedding-client-001.md` to `docs/archive/` (gitignored)
- Moved `docs/about-page-template.txt` to `docs/templates/about-page-template.md`

**Styleguide rewrite**
- `docs/styleguide.md`: reduced from 408 lines to 138 lines
  - Removed obsolete Chakra UI layout section (~280 lines)
  - Fixed `petty-shop` secondary hex value (`#D62828` → `#E74A4A`)
  - Added active palette callout at the top

**Credits formatting**
- `docs/credits.md`: formatted raw dump into markdown tables with headers

**New-client setup guide update**
- `docs/new-client-setup-guide.md`:
  - Section 8: added weekly egress report cron (`0 10 * * 0`), updated to 3 crons total
  - Section 10: updated checklist to include `SLACK_WEBHOOK_URL` secret and verify all 3 crons
