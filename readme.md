# John & Crystal Wedding Website

Client-facing wedding website demo for John Michael May Jr. and Crystal Lynn Collins.

## Current public status

- The full site functionality is now visible from `/` for active style refinement.
- The legacy `/under-construction` route remains available but is no longer the default homepage.
- The active color palette is locked to the bride-selected **Petty Shop** scheme during refinement.

## Stack

- Next.js (Pages Router + TypeScript)
- React + Chakra UI
- CSS modules and page/component CSS
- Vercel for hosting and deployment
- Cloudflare for DNS and email routing
- Supabase (hosted) for guestbook + photo data
- Cloudflare Worker for moderation and public approved-data reads

## What is implemented now

- Functional public homepage with links into live flows
- Core page scaffolding (about, contact, event details, gallery, upload, etc.)
- Reusable UI components and palette/theming context
- Guestbook submit flow writes to Supabase
- Photo upload flow writes metadata to Supabase + file to storage
- Public `gallery` reads approved photos from Worker (`GET /photos/approved`)
- Public `guestbook` reads approved entries from Worker (`GET /guestbook/approved`)
- Admin moderation UI reads protected Worker routes
- Palette switching is disabled and locked to `petty-shop`

## In progress

- Cloudflare production hardening (CORS + Access)
- Final hosted deployment verification (`/health`, protected auth checks)

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment setup

Use the committed example file as your template, then keep real values in your local env file.

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
