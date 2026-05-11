# Developer Reference — Wedding Site Platform

This document covers the technical architecture, local setup, deployment pipeline,
and ongoing maintenance patterns for the John & Crystal (Collins–May 2026) wedding
site. It is the first place to look when picking up or handing off this project.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Stack](#2-stack)
3. [Repository Structure](#3-repository-structure)
4. [Environment Variables](#4-environment-variables)
5. [Local Development](#5-local-development)
6. [Database & Migrations](#6-database--migrations)
7. [Cloudflare Worker](#7-cloudflare-worker)
8. [Access Control & Security](#8-access-control--security)
9. [Deployment](#9-deployment)
10. [Test Suite](#10-test-suite)
11. [Common Tasks](#11-common-tasks)
12. [Dead Code & Stubs](#12-dead-code--stubs)
13. [Debugging Runbook](#13-debugging-runbook)

---

## 1. Architecture Overview

```
Browser
  │
  ├─► Next.js (Vercel)            pages/ — public site
  │     ├── proxy.ts              Edge: geo, rate-limit, bot filter (US-only)
  │     ├── pages/gallery.tsx     Reads from Worker /photos/approved
  │     ├── pages/sendyourphotos  Uploads via UploadThing hook (direct to CDN)
  │     ├── pages/api/guestbook   Server-side POST → Neon insert
  │     └── pages/admin.tsx       Reads/writes through Worker (password-gated)
  │
  └─► Cloudflare Worker           All API surface — no secrets in Next.js runtime
        ├── GET  /photos/approved  Photo list (paginated, sorted)
        ├── GET  /photos/pending   Admin: pending moderation queue
        ├── POST /photos/approve   Admin: mark approved in DB
        ├── POST /photos/reject    Admin: mark rejected in DB
        ├── POST /photos/purge     Admin: hard-delete from DB + UploadThing
        ├── POST /photos/react     Public: toggle love reaction
        ├── GET  /photos/trash     Admin: view trash
        ├── POST /guestbook        Public: submit guestbook entry
        ├── GET  /guestbook        Public: approved entries
        ├── GET  /guestbook/pending  Admin: pending guestbook queue
        ├── POST /guestbook/approve  Admin: approve entry
        ├── POST /guestbook/reject   Admin: reject entry
        ├── GET  /report           Admin: weekly usage report
        ├── GET  /auth/role        Detect admin vs client token
        └── GET  /health           Deployment secrets check

Neon (PostgreSQL — neon.tech)
  ├── photos table          metadata (storage_path/key, file_url, label, love_count, status)
  ├── guestbook_entries     display_name, family_name, side, message, is_visible
  └── photo_reactions       (photo_id, ip_hash) PK — love reaction dedup

UploadThing
  └── wedding photos        CDN-hosted at https://utfs.io/f/<key>
                            file.key is stored as storage_path in the photos table
```

Photos **never flow directly to the browser** from storage. UploadThing CDN URLs are
written to the DB at upload time and returned to clients by the Worker.

---

## 2. Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (Pages Router) + TypeScript |
| Runtime | React 19 |
| Styling | CSS Modules + global CSS, Chakra UI for modals |
| Theme | Custom `PaletteContext` — 5 named palettes |
| Database | Neon (PostgreSQL — serverless, neon.tech) |
| File Storage | UploadThing (CDN file hosting) |
| API | Cloudflare Workers (TypeScript, Wrangler 4) |
| Edge filter | Next.js `proxy.ts` (replaces middleware.ts) |
| Auth | Password-based (`ADMIN_PASSWORD` / `CLIENT_PASSWORD`) |
| Hosting | Vercel (Next.js) + Cloudflare (Worker) |
| Tests | Jest + Testing Library |

---

## 3. Repository Structure

```
weddings/
├── pages/              Next.js pages (Pages Router)
├── components/         Shared React components
├── context/            React context (PaletteContext)
├── lib/                Thin utilities (supabase.ts exports getWeddingSlug, palettes.ts)
├── server/             Server-only code (uploadthing.ts file router)
├── styles/             CSS (global + per-page + per-component)
├── public/             Static assets, robots.txt, font-preview.html
├── proxy.ts            Edge bot/geo/rate-limit filter
├── neon-schema.sql     Full DB schema (apply once to a new Neon project)
├── worker/             Cloudflare Worker (separate npm workspace)
│   └── src/index.ts    All API endpoints
├── docs/               Project documentation (you are here)
├── __tests__/          Jest test suite
├── .env.example        All environment variable documentation
├── vercel.json         Cache headers
├── jest.config.cjs     Test runner config
└── tsconfig.json       TypeScript config (excludes worker/)
```

---

## 4. Environment Variables

See `.env.example` for the full annotated list. Summary:

### Next.js / Vercel

| Variable | Exposure | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Server only | Neon PostgreSQL connection string |
| `UPLOADTHING_TOKEN` | Server only | UploadThing API token |
| `NEXT_PUBLIC_WEDDING_SLUG` | Browser | Per-couple DB partition key |
| `NEXT_PUBLIC_WORKER_BASE_URL` | Browser | Cloudflare Worker URL |
| `RESTRICT_TO_MIDWEST` | Server (proxy.ts) | Restrict to Midwest US states |

### Cloudflare Worker (set via `wrangler secret put`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `UPLOADTHING_TOKEN` | UploadThing API token |
| `ADMIN_PASSWORD` | Admin UI authentication |
| `CLIENT_PASSWORD` | Couple / family access token |
| `ADMIN_ORIGIN` | CORS allowed origin for admin |
| `SITE_ORIGIN` | CORS allowed origin(s) for public site |
| `HF_TOKEN` | HuggingFace NSFW classifier token |
| `SLACK_WEBHOOK_URL` | Weekly report Slack webhook |
| `RESTRICT_TO_MIDWEST` | Block non-Midwest states at Worker level |

---

## 5. Local Development

```bash
# Install Next.js dependencies
npm install

# Copy env template and fill in values
cp .env.example .env.local

# Start Next.js dev server (Turbopack)
npm run dev
```

To run the Worker locally:

```bash
cd worker
npm install
npx wrangler dev
# Worker runs at http://localhost:8787
```

Set `NEXT_PUBLIC_WORKER_BASE_URL=http://localhost:8787` in `.env.local` to point
the Next.js app at your local worker.

---

## 6. Database & Migrations

The full schema lives in `neon-schema.sql` at the repo root. Apply it once to a new Neon project:

```bash
psql "<DATABASE_URL>" -f neon-schema.sql
```

All statements use `CREATE IF NOT EXISTS` — safe to re-run for upgrades.

**Key tables:**

- `photos` — `id`, `storage_path` (UploadThing file key), `file_url`, `label_raw`, `label_slug`, `wedding_slug`, `status` (pending/approved/rejected/flagged), `love_count`, `is_visible`, `created_at`
- `guestbook_entries` — `id`, `display_name`, `family_name`, `side`, `message`, `wedding_slug`, `is_visible`, `created_at`
- `photo_reactions` — `(photo_id, ip_hash)` primary key — deduplicates love reactions per IP per photo

**`react_to_photo(uuid, text)` function:** Atomic upsert — inserts a reaction row and increments `love_count` in one transaction. Silently ignores duplicate IPs.

**File storage:** UploadThing CDN (`https://utfs.io/f/<key>`). The file key is stored as `storage_path` in the `photos` table. There is no folder/prefix structure — keys are flat UUIDs assigned by UploadThing.

**No RLS:** Access is controlled at the Worker layer. The `DATABASE_URL` connection string is the only credential needed — keep it secret.

**To add a new column:**

```sql
-- Run via psql or the Neon SQL editor:
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS my_column text;
```

Then update `neon-schema.sql` to document it.

---

## 7. Cloudflare Worker

All source lives in `worker/src/index.ts`. TypeScript, compiled via Wrangler.

### Cron Schedule (wrangler.jsonc)

| Cron | Purpose |
|------|---------|
| `0 9 * * *` | Daily keepalive ping (prevents Worker from going cold) |
| `*/2 * * * *` | Auto-moderation: run HuggingFace NSFW check on pending uploads |
| `0 10 * * 0` | Weekly egress report on Sunday at 10:00 UTC |

### Adding a New Endpoint

1. Add the route string to `ADMIN_ROUTES` or `CLIENT_ROUTES` (or neither for public).
2. Add a `case 'METHOD /path':` block in the `switch` statement.
3. Write a handler function and add it below the router.
4. Update Worker secrets if the endpoint needs new env bindings.
5. Add a test in `worker/test/index.spec.ts`.

### Deploying

```bash
cd worker
npx wrangler deploy
```

After deploy, confirm secrets are loaded:
```
GET https://worker.yourname.workers.dev/health
# Expected: {"ok":true,"url":true,"key":true}
```

---

## 8. Access Control & Security

### Edge Layer (proxy.ts)

Applied at Vercel Edge before pages are served:

- **Geo restriction:** US-only (Cloudflare `CF-IPCountry` header). Set `RESTRICT_TO_MIDWEST=true` to add state-level restriction.
- **Bot filter:** Blocks known scraper/AI-trainer user-agents (15+ rules).
- **Rate limit:** 20 requests/minute per IP using an in-memory sliding window.
- **Browser check (gallery/upload paths):** Requires an `Accept: text/html` header. Raw HTTP tools (curl, wget, programmatic scrapers) get 403.

### Worker Layer

Applied by the Cloudflare Worker runtime on every API request:

- **Geo block:** Rejects non-US countries before any logic runs.
- **ASN block:** Rejects known cloud/datacenter provider ASNs (AWS, GCP, Azure, Digital Ocean, etc.).
- **Bot score:** Rejects Cloudflare Bot Management score < 30 (likely automated).
- **Auth:** Admin endpoints require `Authorization: Bearer <ADMIN_PASSWORD>`. Client endpoints accept either token. Public endpoints are unauthenticated.
- **CORS:** Responses include `Access-Control-Allow-Origin` restricted to `ADMIN_ORIGIN` / `SITE_ORIGIN`.

---

## 9. Deployment

### Next.js (Vercel)

Push to `main` triggers auto-deploy. Vercel reads env vars from project settings.

Required Vercel environment variables: all `NEXT_PUBLIC_*` vars + `RESTRICT_TO_MIDWEST`.

**Cache behavior (vercel.json):**
- `/_next/static/*` — 1 year, immutable
- `/photos/*` — 24 hours, stale-while-revalidate 1 hour
- All other pages — no cache (`must-revalidate`)

### Cloudflare Worker

```bash
cd worker
npx wrangler deploy
```

Secrets are set separately from code:

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put UPLOADTHING_TOKEN
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put CLIENT_PASSWORD
npx wrangler secret put SITE_ORIGIN
npx wrangler secret put ADMIN_ORIGIN
npx wrangler secret put HF_TOKEN              # optional
npx wrangler secret put SLACK_WEBHOOK_URL     # optional
npx wrangler secret put RESTRICT_TO_MIDWEST   # optional
```

---

## 10. Test Suite

Tests live in `__tests__/pages/` and run with Jest + Testing Library.

```bash
npm test           # run all tests
npm run test:watch # watch mode
```

| Test file | What it covers |
|-----------|----------------|
| `admin-auth.test.tsx` | Admin page auth modal, empty URL guard, fetch calls |
| `gallery-worker.test.tsx` | Gallery page: worker integration, pagination, sort |
| `guestbook-upload.test.tsx` | Send Your Photos page: upload flow, validation |
| `guestbook-validation.test.tsx` | Guestbook: form validation, submission logic |
| `new-components.test.tsx` | NavBar, SiteFooter, QRCodeFlyer rendering |
| `public-routes.test.tsx` | About, Contact, Registry, Index rendering + content |

**Testing conventions:**
- Mock `fetch` globally per test file.
- Set `process.env.NEXT_PUBLIC_WORKER_BASE_URL` in `beforeEach` and restore in `afterEach`.
- Component tests use `@testing-library/react` + `@testing-library/jest-dom`.
- No Supabase integration tests — use the Worker mock pattern for API calls.

Worker tests live in `worker/test/index.spec.ts` and use Vitest.

---

## 11. Common Tasks

### Add a new palette

1. Add the palette object to `lib/palettes.ts`.
2. Add the name to the union type in `lib/palettes.ts`.
3. Add a swatch to `components/ColorSwatches.tsx`.
4. Test with `PalettePicker` on the admin or demo page.

### Add a new page

1. Create `pages/mypage.tsx`.
2. Add a CSS file at `styles/pages/mypage.css` if needed.
3. Import the CSS in `pages/_app.tsx`.
4. Add to NavBar if it's a top-level page (`components/NavBar.tsx`).
5. Add to `proxy.ts` if it needs the Accept-header browser check.

### Run the worker locally against production Supabase

```bash
cd worker
npx wrangler dev --env production
```

Set `NEXT_PUBLIC_WORKER_BASE_URL=http://localhost:8787` locally.

### Deploy only secrets (no code change)

```bash
cd worker
npx wrangler secret put <SECRET_NAME>
# No need to redeploy — secrets take effect immediately
```

### Add a new DB column

```sql
-- Run via psql or the Neon SQL editor:
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS my_column text;
-- Then update neon-schema.sql to document the change.
```

---

## 12. Dead Code & Stubs

| File | Classification | Notes |
|------|---------------|-------|
| `pages/upload.tsx` | ACTIVE-ALTERNATE | Redirects to `/sendyourphotos`. Kept because some QR code flyer v1 links pointed here, and robots.txt blocks this path. |
| `pages/demo.tsx` | ACTIVE-ALTERNATE | Dev tool — renders Gallery component with live Worker data. Not linked in NavBar. |
| `pages/fonts.tsx` | ACTIVE-ALTERNATE | Dev tool — renders `/font-preview.html` in an iframe. Not linked in NavBar. |
| `pages/event-details.tsx` | LEGACY-BUT-USEFUL | Minimal event detail stub. Full schedule is at `/program`. Keep unless you need the URL for a different purpose. |
| `app/api/` | Empty folder | Safe to delete; Next.js ignores empty dirs. Leftover from early App Router exploration. |
| `worker GET /health` | ACTIVE-ALTERNATE | Secrets presence check. Keep it — it's safe and useful post-deploy. |
| `docs/path-forward-stable-placeholder.md` | Historical | Documents the pre-launch planning. No action needed. |

---

## 13. Debugging Runbook

### Gallery shows no photos

1. Check `NEXT_PUBLIC_WORKER_BASE_URL` is set and correct.
2. Open DevTools → Network. Look for the `/photos/approved` request.
3. If 401: Worker `CLIENT_PASSWORD` or `SITE_ORIGIN` is wrong.
4. If 403: Geo/bot block. Test from a US IP. Check `CF-IPCountry` header.
5. If 200 but empty: No approved photos in the DB for this `wedding_slug`.

### Photo upload fails silently

1. Check `UPLOADTHING_TOKEN` is set in Vercel env vars.
2. Look for `console.error('Submission error')` in the browser console.
3. If UploadThing returns 403: token is wrong or expired — regenerate at [uploadthing.com](https://uploadthing.com).
4. If validation error: See `validatePhotoSubmission` in `pages/sendyourphotos.tsx`.

### Worker returns 403 for all requests

1. `GET /health` — if this also returns 403, the Worker is blocking at the geo/bot layer.
2. Test with a known-good US IP. Use `curl -H "CF-IPCountry: US"` to fake it locally.
3. Check ASN blocklist in `worker/src/index.ts` — your ISP's ASN may be listed.

### Admin page shows auth modal even after correct password

1. Confirm `NEXT_PUBLIC_WORKER_BASE_URL` is set in Vercel env (not just `.env.local`).
2. Check CORS: `ADMIN_ORIGIN` Worker secret must match your Vercel deployment URL exactly.

### Weekly egress report not arriving

1. Check cron schedule in `worker/wrangler.jsonc` — `0 10 * * 0` = Sunday 10:00 UTC.
2. Check `SLACK_WEBHOOK_URL` Worker secret is set and the webhook is active.
3. `GET /report` (with admin token) to see the data the report would send.

### Guestbook shows 0 entries even though they exist

1. **Check the wedding slug.** The most common cause is a slug mismatch between
   what's in the DB and what `NEXT_PUBLIC_WEDDING_SLUG` is set to.
   Run: `GET /guestbook/approved?wedding_slug=<slug>` with a browser User-Agent.
   Try different slug values until you find which one returns data.
2. Correct the slug in `.env.local` (local) and Vercel env vars (production).
3. The slug used when entries were submitted is the slug they're stored under.
   There's no rename \u2014 if you change the slug, old entries won't appear under the new one.

### Admin dashboard shows all panels as 0 after login

The most likely cause is a Worker version mismatch \u2014 the deployed Worker is older than
the source code, and one of the five `Promise.all` requests in `refreshData()` is hitting
a route that doesn't exist on the deployed Worker (returns 404, which causes the whole
`Promise.all` to reject and nothing renders).

1. Check which route is returning 404: open DevTools → Network after login and look for
   a failed request among `/photos/pending`, `/photos/approved`, `/photos/trash`,
   `/guestbook`, `/admin/stats`.
2. Redeploy the Worker: `cd worker && npx wrangler deploy`.
3. Verify with `GET /health` \u2014 should return `{"ok":true,"db":true}`.

### Run the worker locally against production Neon

```bash
cd worker
npx wrangler dev
```
The Worker will use secrets from `.dev.vars` if present (copy from `.env.local`).
Set `NEXT_PUBLIC_WORKER_BASE_URL=http://localhost:8787` in the Next.js `.env.local`.

---

## 14. Post-Ceremony Transition (May 2026)

The ceremony was held May 9, 2026. The site will remain live for ~11 months
before the domain expires and the static version is migrated to `sitesbymac.dev/weddings/JohnandCrystalMay`.

### What changed post-ceremony

- **Congratulations banner** added to the landing page (`pages/index.tsx`). Auto-hides
  after June 9, 2026 (`showCongratsBanner = new Date() < new Date("2026-06-09T00:00:00")`).
- **Guestbook submissions** remain open \u2014 family and friends continue signing post-wedding.
- **Photo uploads** remain open \u2014 guests may still share photos taken at the venue.
- **Admin moderation** still works \u2014 use it to curate the gallery and guestbook over time.

### Sunsetting checklist (when ready)

- [ ] Export DB: `pg_dump` from Neon → save as static JSON or SQL backup
- [ ] Download all photos from UploadThing CDN
- [ ] Build static snapshot of site HTML/CSS
- [ ] Deploy static version to `sitesbymac.dev/weddings/JohnandCrystalMay`
- [ ] Let domain registration expire (do not auto-renew)
- [ ] Archive this repo with a final README note
