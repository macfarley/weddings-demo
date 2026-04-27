# How to Set Up a New Wedding Site
### Reusable Deployment Guide

**Goal:** Spin up a fresh wedding microsite for a new couple using the existing
Supabase + Vercel + Cloudflare Worker infrastructure. Start from a clean fork of
this repo, swap in the couple's identity, and deploy all three layers.

This guide assumes:
- This repo is already deployed and working for at least one couple
- You have access to GitHub, Supabase, Vercel, and the Cloudflare account
- You have the Supabase CLI (`npx supabase`) and Wrangler (`npx wrangler`) available locally

---

## SECTION 1 — FORK THE REPO

1. **Create a new GitHub repo** — one repo per couple is the cleanest approach.
   Either fork this repo on GitHub or use `git clone` + push to a new remote:

   ```bash
   git clone https://github.com/YOUR_ORG/weddings.git wedding-doe-smith-2027
   cd wedding-doe-smith-2027
   git remote set-url origin https://github.com/YOUR_ORG/wedding-doe-smith-2027.git
   git push -u origin main
   ```

2. **Remove couple-specific public assets** — replace with new couple's files or
   placeholder images later:

   ```
   public/photos/checkered-flag.jpg   ← background image (replace or keep)
   public/photos/glassespic.jpg       ← about page hero photo (replace)
   public/photos/pexels-*.jpg         ← placeholder gallery stock photos (remove when real ones exist)
   ```

3. **Keep all core infrastructure** — do not remove anything under:
   ```
   components/
   context/
   lib/
   pages/
   styles/
   worker/
   supabase/migrations/
   ```

---

## SECTION 2 — PERSONALIZE THE COUPLE'S IDENTITY

There is no single config file — identity is spread across a few well-known spots.
Search for `John & Crystal` and `May 9, 2026` to find every hardcoded reference.

### 2a. Navbar brand text
**File:** `components/NavBar.tsx` — line ~24

```tsx
// Change this:
John & Crystal's Wedding | May 9, 2026

// To:
Alex & Taylor's Wedding | June 14, 2027
```

### 2b. Home page hero heading
**File:** `pages/index.tsx` — top of the JSX

```tsx
// Change:
John & Crystal&apos;s Wedding Website

// To:
Alex & Taylor&apos;s Wedding Website
```

### 2c. Program page details
**File:** `pages/program.tsx`
- Update date string: `"Friday, May 9, 2026 • Junior Fair Building, Wapakoneta, Ohio"`
- Update ceremony and reception timeline arrays at the top of the file

### 2d. About page
**File:** `pages/about.tsx`
- Update the His/Hers/Ours card text to match the new couple
- Swap out `/public/photos/glassespic.jpg` with the couple's hero photo (keep the same filename or update the `src` attribute)

### 2e. Event details / Contact / Registry pages
**Files:** `pages/event-details.tsx`, `pages/contact.tsx`, `pages/registry.tsx`
- Update addresses, links, and any couple-specific copy inline in these files

### 2f. Wedding slug
The slug is how Supabase rows are scoped to one couple. Set it in the environment:

```env
NEXT_PUBLIC_WEDDING_SLUG=doe-smith-2027
```

This does **not** need to change any source files — it's read from env at runtime
via `lib/supabase.ts → getWeddingSlug()`.

---

## SECTION 3 — SET THE COLOR PALETTE

**File:** `lib/palettes.ts`

Four named palettes are already defined. The active default is set in:

**File:** `context/PaletteContext.tsx` — line ~14

```tsx
const [activePalette] = useState<PaletteName>('petty-shop');
```

Change the default palette name to one of:
- `'dirt-track-sunset'` — warm clay, cream, sunset orange
- `'petty-shop'` — Petty Blue, shop red, silver
- `'victory-lane'` — electric blue, victory yellow, cherry red
- `'moonshine-runner'` — barn red, mason-jar blue, corn whiskey gold

Or add a new palette entry to `lib/palettes.ts` for the couple's brand colors — just
follow the existing `Palette` type and give it a unique key.

### Background image
**File:** `pages/_document.tsx` and `styles/globals.css`

Both reference `/photos/checkered-flag.jpg` as the fixed background. Replace this
file in `public/photos/` with the new couple's background, or update both references
to point to a different filename.

---

## SECTION 4 — SEO & PAGE TITLES

**File:** `pages/_document.tsx` — `<Head>` section for global meta.

Each page also sets its own `<title>` and `<meta name="description">` via Next.js
`<Head>` components at the top of each `pages/*.tsx` file. Search for `<Head>` and
`<title>` across the pages directory to update them all.

---

## SECTION 5 — CREATE A NEW SUPABASE PROJECT

1. Go to [supabase.com](https://supabase.com) → New Project
   - Name: `wedding-doe-smith-2027`
   - Region: closest to the couple's guests (US East for Ohio, etc.)
   - Save the database password somewhere secure

2. **Apply migrations** — in the Supabase SQL Editor, run each file in order:

   ```
   supabase/migrations/20260226223000_initial_setup.sql
   supabase/migrations/20260302161500_add_photo_labels.sql
   supabase/migrations/20260310135718_schema_only.sql
   supabase/migrations/20260416120000_add_love_reactions.sql
   ```

   Or via the CLI if you have the DB password:
   ```bash
   npx supabase db push --linked
   ```

3. **Confirm tables exist:**
   - `photos` (with `status`, `wedding_slug`, `love_count`, `is_visible`)
   - `guestbook_entries` (with `wedding_slug`, `status`)
   - `photo_reactions` (with `photo_id`, `ip_hash`)
   - Confirm `react_to_photo(uuid, text)` function exists

4. **Create the storage bucket**
   - Name: `wedding-photos` (must match the `BUCKET` constant in `worker/src/index.ts`)
   - Type: Private (the Worker handles all signed URL generation)

5. **Collect credentials** for the next steps:
   - Project URL (`SUPABASE_URL`)
   - Anon/public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Service role key (for the Worker only — never expose in the browser)

---

## SECTION 6 — DEPLOY THE CLOUDFLARE WORKER

1. **Update the Worker name** in `worker/wrangler.jsonc`:

   ```jsonc
   {
     "name": "wedding-doe-smith-worker",
     ...
   }
   ```

2. **Deploy:**
   ```bash
   cd worker
   npm install
   npx wrangler deploy
   ```

3. **Set Worker secrets** (run each one and paste the value when prompted):

   ```bash
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put ADMIN_PASSWORD
   npx wrangler secret put CLIENT_PASSWORD
   npx wrangler secret put ADMIN_ORIGIN       # Your Vercel domain, e.g. https://wedding-doe-smith.vercel.app
   npx wrangler secret put HF_TOKEN           # Optional: HuggingFace token for NSFW auto-moderation
   ```

   > `ADMIN_PASSWORD` → full destructive access (purge, hard-delete)  
   > `CLIENT_PASSWORD` → approve/trash access (give to the couple or photographer)

4. **Verify the Worker is live:**
   ```bash
   curl https://wedding-doe-smith-worker.YOUR_ACCOUNT.workers.dev/health
   # Expected: {"ok":true,"url":true,"key":true}
   ```

5. **Note the Worker URL** — you'll set this in Vercel next.

---

## SECTION 7 — DEPLOY THE FRONTEND (VERCEL)

1. Import the new GitHub repo into Vercel
2. Framework: **Next.js** (auto-detected)
3. Set environment variables:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | From Supabase project settings |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase project settings |
   | `NEXT_PUBLIC_WEDDING_SLUG` | `doe-smith-2027` |
   | `NEXT_PUBLIC_WORKER_BASE_URL` | `https://wedding-doe-smith-worker.YOUR_ACCOUNT.workers.dev` |

4. Deploy
5. **Verify:**
   - `/` — home page loads, correct names
   - `/gallery` — loads, shows "No approved photos yet"
   - `/guestbook` — loads, form works
   - `/sendyourphotos` — upload form loads
   - `/admin` — prompts for password

---

## SECTION 8 — VERIFY CRON JOBS

The Worker `wrangler.jsonc` includes three cron triggers:

```jsonc
"triggers": {
  "crons": ["0 9 * * *", "*/2 * * * *", "0 10 * * 0"]
}
```

| Cron | Schedule | Purpose |
|------|---------|---------|
| `0 9 * * *` | Daily at 09:00 UTC | Keep-alive ping to prevent Supabase free-tier auto-pause |
| `*/2 * * * *` | Every 2 minutes | Auto-moderate pending photos via HuggingFace NSFW classifier (noop if no `HF_TOKEN`) |
| `0 10 * * 0` | Sundays at 10:00 UTC | Weekly egress report delivered to Slack / email |

These are active immediately after `wrangler deploy`. Confirm in the Cloudflare
dashboard under **Workers & Pages → your worker → Triggers → Cron Triggers**.

To test the weekly report manually:
```bash
curl -H "Authorization: Bearer <ADMIN_PASSWORD>" https://your-worker.workers.dev/report
```

---

## SECTION 9 — UPLOAD TEST CONTENT & END-TO-END CHECK

1. Go to `/sendyourphotos` — upload a test photo
2. Go to `/admin` → log in with `CLIENT_PASSWORD` → approve the photo
3. Go to `/gallery` — confirm the photo appears
4. Click the ❤️ love button — confirm the count increments
5. Go to `/guestbook` — submit a test message
6. Go to `/admin` → confirm the guestbook entry is visible
7. Go to `/program` — confirm correct date and schedule

---

## SECTION 10 — FINAL CHECKLIST

- [ ] Couple names and date updated in `NavBar.tsx` and `pages/index.tsx`
- [ ] `NEXT_PUBLIC_WEDDING_SLUG` set to unique slug for this couple
- [ ] Background image replaced or confirmed appropriate
- [ ] Color palette default set in `context/PaletteContext.tsx`
- [ ] All migrations applied to new Supabase project
- [ ] Storage bucket `wedding-photos` created (private)
- [ ] Worker deployed with all 5+ secrets set (including `SLACK_WEBHOOK_URL` if using weekly reports)
- [ ] Vercel env vars all set and redeployed
- [ ] `/health` endpoint returns `{"ok":true,...}`
- [ ] Photo upload → approve → gallery flow tested end-to-end
- [ ] Guestbook submission tested
- [ ] Admin password works; client password works
- [ ] All 3 cron triggers visible in Cloudflare dashboard
- [ ] Custom domain mapped (optional — do in Vercel and Cloudflare DNS)

---

## SECTION 11 — OPTIONAL: CUSTOM DOMAIN

1. In Vercel: Project Settings → Domains → Add your domain
2. In Cloudflare DNS (or registrar): add the CNAME record Vercel provides
3. SSL is automatic via Vercel

If the Worker also needs a custom subdomain (e.g. `api.thecouplesdomain.com`):
1. Cloudflare dashboard → Workers & Pages → your worker → Custom Domains
2. Add the subdomain
3. Update `ADMIN_ORIGIN` Worker secret and `NEXT_PUBLIC_WORKER_BASE_URL` in Vercel

---

## SECTION 12 — PRICING / TIER NOTES

**Current stack — all free tiers:**
- Supabase Free: 500MB storage, 5GB bandwidth, pauses after 7 days inactive (cron keeps it alive)
- Vercel Hobby: unlimited deployments, 100GB bandwidth
- Cloudflare Workers Free: 100k requests/day, 2 cron invocations/day max on paid plan (free: limited)

**If the couple needs more:**
- Supabase Pro ($25/mo): no auto-pause, 8GB storage, point-in-time recovery
- Vercel Pro ($20/mo): team access, password protection, analytics
- Cloudflare Workers Paid ($5/mo): unlimited cron, 10M requests/day

**Premium feature ideas for future clients:**
- Wedding party bio section (`/wedding-party`)
- Love story timeline page
- Custom album groupings in gallery
- Highlight reel (pinned photos) 
- Video embed section
- Role-based access (e.g. photographer dashboard vs. guest view)
- Post-wedding "afterglow" mode (read-only archive, download gallery)

---

*This guide reflects the architecture as of April 2026. The codebase uses: Next.js (Pages Router), Supabase (Postgres + Storage), Cloudflare Workers (API + cron), Vercel (frontend hosting).*
