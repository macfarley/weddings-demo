# John & Crystal Wedding Website

Client-facing wedding website demo for John Michael May Jr. and Crystal Lynn Collins.

## Current public status

- The homepage currently shows an **Under Construction** experience for the custom domain launch.
- This is intentional while final content and production integrations are being completed.
- Internal pages and feature scaffolding exist in the repo but are not the public launch experience.

## Stack

- Next.js (Pages Router + TypeScript)
- React + Chakra UI
- CSS modules and page/component CSS
- Vercel for hosting and deployment
- Cloudflare for DNS and email routing
- Supabase integration scaffolding (not fully wired yet)

## What is implemented now

- Public under-construction landing page
- Core page scaffolding (about, contact, event details, gallery, upload, etc.)
- Reusable UI components and palette/theming context
- Static media assets for mock/demo presentation

## In progress

- Real upload pipeline to Supabase storage
- Moderation and approval workflow
- Production-ready API route wiring for moderation actions

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

- `pages/index.tsx` currently exports the under-construction page for launch safety.
- Supabase files in `lib/` and `supabase/` are placeholders for the upcoming production integration.
