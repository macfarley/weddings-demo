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

---

## Developer Documentation

**For full technical documentation, see [docs/DEVELOPER.md](docs/DEVELOPER.md).**  
**For future site deployments, see [docs/templates/new-site-checklist.md](docs/templates/new-site-checklist.md).**

### Quick Start

```bash
npm install
cp .env.example .env.local    # fill in values
npm run dev                    # Next.js at http://localhost:3000

cd worker && npm install
npx wrangler dev               # Worker at http://localhost:8787
```

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (Pages Router) + TypeScript |
| Hosting | Vercel |
| Database | Neon (PostgreSQL — serverless) |
| File Storage | UploadThing |
| API | Cloudflare Worker (Wrangler 4, TypeScript) |
| Edge filter | `proxy.ts` — geo, bot, rate-limit |
| Tests | Jest + Testing Library |

### Environment Variables

See `.env.example` for the full annotated list. Key variables:

| Variable | Exposure | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Server-only | Neon PostgreSQL connection string — never expose in browser |
| `UPLOADTHING_TOKEN` | Server-only | UploadThing API token |
| `NEXT_PUBLIC_WEDDING_SLUG` | Browser | Per-couple DB partition key |
| `NEXT_PUBLIC_WORKER_BASE_URL` | Browser | Cloudflare Worker URL |
| `RESTRICT_TO_MIDWEST` | Server (proxy.ts) | Optional regional restriction |

Worker secrets are set via `wrangler secret put` (see [docs/DEVELOPER.md](docs/DEVELOPER.md)).

### Tests

```bash
npm test              # run all Jest tests (8 suites, 75 tests)
npm run test:watch    # watch mode
```

### Project Documentation Index

| Document | Purpose |
|----------|---------|
| [docs/DEVELOPER.md](docs/DEVELOPER.md) | Architecture, deployment, debugging runbook |
| [docs/GUEST-GUIDE.md](docs/GUEST-GUIDE.md) | Guest-facing guide (upload, gallery, privacy) |
| [docs/devlog.md](docs/devlog.md) | Chronological development notes |
| [docs/styleguide.md](docs/styleguide.md) | Typography, palette, CSS conventions |
| [docs/content-moderation.md](docs/content-moderation.md) | Moderation policy and NSFW pipeline |
| [docs/new-client-setup-guide.md](docs/new-client-setup-guide.md) | Onboarding a new couple |
| [docs/templates/new-site-checklist.md](docs/templates/new-site-checklist.md) | Step-by-step for a new deployment |
| [docs/templates/deploy-security-checklist.md](docs/templates/deploy-security-checklist.md) | Pre-launch security review |
| [docs/templates/pitfalls.md](docs/templates/pitfalls.md) | Known gotchas and how to avoid them |
| [docs/supabase-to-neon-migration.md](docs/supabase-to-neon-migration.md) | Why and how we migrated off Supabase |

> **Note:** The repo contains two separate TypeScript projects — the root Next.js app and `worker/`. The root `tsconfig.json` intentionally excludes `worker/` to prevent Vercel's build from type-checking Worker-only files. Do not remove this boundary.

