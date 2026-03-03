# Dev Log

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
