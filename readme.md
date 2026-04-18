# John & Crystal Wedding Website

Client-facing wedding website for John Michael May Jr. and Crystal Lynn Collins.  
**Friday, May 9, 2026 — Junior Fair Building, Wapakoneta, Ohio**

Live at: [john-and-crystal-may.wedding](https://www.john-and-crystal-may.wedding)

---

## 💌 For John & Crystal — How to Use Your Site

Everything your guests need is already live. Here's what to know.

### Sharing photos with guests

1. Open **[/qrcodeflyer](https://www.john-and-crystal-may.wedding/qrcodeflyer)** — a print-ready flyer will appear. Print it or save as PDF.
2. Place printed copies at venue tables. Guests scan the QR code to upload photos from their phone camera directly to your gallery.
3. Photos go through moderation before appearing publicly — nothing embarrassing gets shown automatically.

### Approving photos and guestbook messages

1. Go to **[/admin](https://www.john-and-crystal-may.wedding/admin)** and enter the admin password (ask Mac if you don't have it).
2. You'll see all pending photos and guestbook entries.
3. **Approve** what you want shown publicly. **Reject** anything you don't want. Rejected items are removed from storage entirely.
4. Approved photos appear in the **[/gallery](https://www.john-and-crystal-may.wedding/gallery)** for all guests to see and react to with ❤️.

### Guestbook entries

- Guests sign the guestbook at **[/guestbook](https://www.john-and-crystal-may.wedding/guestbook)**.
- New entries are held for your approval in the admin dashboard — same process as photos.
- Approved entries appear in the racetrack layout, sorted into Bride's side and Groom's side.

### Your pages at a glance

| Page | URL | What it does |
|---|---|---|
| Home | `/` | Landing page with navigation pills |
| Event Program | `/program` | Ceremony order, readings, music |
| About the Couple | `/about` | Your story and photo |
| Photo Gallery | `/gallery` | Approved guest photos with ❤️ reactions |
| Sign the Guestbook | `/guestbook` | Guest messages (racetrack layout) |
| Send Your Photos | `/sendyourphotos` | Guest photo upload form |
| QR Code Flyer | `/qrcodeflyer` | Print-ready venue flyer |
| Admin | `/admin` | Moderate photos + guestbook entries |

### If something looks wrong

Contact **Mac McCoy** at [Mac@sitesbymac.dev](mailto:Mac@sitesbymac.dev) or visit [SitesbyMac.dev](https://www.sitesbymac.dev).

---

## Stack

- **Next.js** (Pages Router + TypeScript) — frontend + routing
- **Vercel** — hosting and deployment
- **Supabase** — photo metadata (`photos` table), guestbook entries (`guestbook_entries` table), and photo file storage (`wedding-photos` bucket)
- **Cloudflare Worker** — moderation API, approved-content reads, signed URL generation
- **Cloudflare DNS** — domain routing

## What's live

- Public homepage with vertical stoplight pill navigation (Event Program, About, Gallery, Guestbook, Send Photos)
- About, Program, Event Details, Gallery, Guestbook, Registry, Contact
- **Send Your Photos** (`/sendyourphotos`) — guests upload photos directly to Supabase Storage; metadata rows land in `photos` with `status = pending`
- **Guestbook** (`/guestbook`) — racetrack road layout with bride/groom lane columns; car-card entries; guests submit messages that land in `guestbook_entries`
- **Gallery** (`/gallery`) — shows Worker-approved photos with signed URLs; emoji wedding-tile placeholders when no photos are live
- **QR Code Flyer** (`/qrcodeflyer`) — printable venue flyer with QR code linking to `/sendyourphotos`; auto-triggers browser print dialog
- **Admin** (`/admin`) — password-gated moderation UI for approving/rejecting photos and guestbook entries
- Palette/theming context (locked to bride-selected scheme)
- Shared `SiteFooter` component shown on all pages (creator info / SitesbyMac.dev)

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

## Deployment

Vercel auto-deploys on push to `main`. Framework is auto-detected as Next.js.

DNS is managed through Cloudflare. Domain records point to Vercel; email routing records remain in Cloudflare.

> **Note:** The repo contains two separate TypeScript projects — the root Next.js app and `worker/`. The root `tsconfig.json` intentionally excludes `worker/` to prevent Vercel's build from type-checking Worker-only files. Do not remove this boundary.
