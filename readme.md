# John & Crystal Wedding Website

Client-facing wedding website for John Michael May Jr. and Crystal Lynn Collins.  
**Friday, May 9, 2026 — Junior Fair Building, Wapakoneta, Ohio**

Live at: [john-and-crystal-may.wedding](https://www.john-and-crystal-may.wedding)

## Stack

- **Next.js** (Pages Router + TypeScript) — frontend + routing
- **Vercel** — hosting and deployment
- **Supabase** — photo metadata (`photos` table), guestbook entries (`guestbook_entries` table), and photo file storage (`wedding-photos` bucket)
- **Cloudflare Worker** — moderation API, approved-content reads, signed URL generation
- **Cloudflare DNS** — domain routing

## What's live

- Public homepage with links to all guest-facing pages
- About, Program, Event Details, Gallery, Guestbook, Registry, Contact
- **Send Your Photos** (`/sendyourphotos`) — guests upload photos directly to Supabase Storage; metadata rows land in `photos` with `status = pending`
- **Guestbook** (`/guestbook`) — guests submit messages; entries land in `guestbook_entries`
- **Gallery** (`/gallery`) — shows Worker-approved photos with signed URLs
- **Admin** (`/admin`) — password-gated moderation UI for approving/rejecting photos and guestbook entries
- Palette/theming context (locked to bride-selected scheme)

## Architecture

```
Guest browser
  ├─ Photo upload ──► Supabase Storage (uploads/)
  │                ──► Supabase DB (photos, status=pending)
  ├─ Guestbook ────► Supabase DB (guestbook_entries)
  └─ Gallery/GB reads ──► Cloudflare Worker ──► Supabase DB + signed URLs

Admin browser
  └─ Moderation UI ──► Cloudflare Worker (Bearer auth) ──► Supabase
                          approve: moves file uploads/ → approved/, updates DB
                          reject:  removes file, marks rejected
```

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

Copy `.env.example` to `.env` and fill in your values:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (browser-safe) |
| `NEXT_PUBLIC_WORKER_BASE_URL` | Cloudflare Worker URL |
| `NEXT_PUBLIC_WEDDING_SLUG` | Wedding identifier (`john-crystal-2026`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only — never expose in browser |

## Database schema

Schema is maintained as idempotent SQL migrations in `supabase/migrations/`.  
`supabase/setup-live.sql` is a single-file composite you can paste directly into the Supabase SQL editor to initialize a fresh project.

## Worker

The Cloudflare Worker lives in `worker/`. Deploy with:

```bash
cd worker
npx wrangler deploy
```

Required Worker secrets (set via `wrangler secret put`):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`
- `ADMIN_ORIGIN` (optional — locks CORS to your Vercel domain)

```bash
cp .env.example .env
```

Fill in these values in `.env`:

- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN` (for CLI commands)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_WEDDING_SLUG` (for multi-site partitioning, defaults to `default`)
- `NEXT_PUBLIC_WORKER_BASE_URL` (used by `/admin`, `/gallery`, and `/guestbook`)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)

Notes:

- `.env` is gitignored and should never be committed.
- `.env.example` stays in git with placeholder values only.

## Deployment

The project is set up for Vercel deployment:

- Framework preset: Next.js (auto-detected)
- Build command: `next build`
- Start command: `next start`

For custom domain launch through Cloudflare, point DNS for the site hostnames to Vercel and keep Cloudflare email routing records in place.

### Vercel build note (important)

This repo contains two TypeScript projects:
- root Next.js app
- `worker/` Cloudflare Worker

The root app `tsconfig.json` intentionally excludes `worker/` so Vercel's Next build does not type-check Worker-only config files.
If this boundary is removed, deploys can fail with errors from `worker/vitest.config.mts` (for example, missing `@cloudflare/vitest-pool-workers/config` in the root app install).

## Project structure

```text
pages/
components/
context/
styles/
public/
lib/
docs/
supabase/
```

## Notes

- `pages/index.tsx` now serves the functional homepage for style and UX refinement.
- Public pages fall back to local mock/demo content only when `NEXT_PUBLIC_WORKER_BASE_URL` is unset.
- Worker should expose public read routes (`GET /photos/approved`, `GET /guestbook/approved`) and protected moderation routes.
