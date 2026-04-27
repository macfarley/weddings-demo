# New Wedding Site Checklist

Use this checklist when spinning up a site for a new couple.
Work top-to-bottom — each section depends on the previous.

---

## Phase 1: Repository Setup

- [ ] Fork or copy the `weddings` repository
- [ ] Rename the package in `package.json` (`"name": "weddings-<slug>"`)
- [ ] Update `NEXT_PUBLIC_WEDDING_SLUG` — URL-safe, e.g. `smith-jones-2027`
- [ ] Search and replace all wedding-specific copy:
  - Couple names (grep for "John" and "Crystal" or "Collins" and "May")
  - Wedding date
  - Venue name and address
  - Registry links
  - Program/schedule content
- [ ] Update `pages/about.tsx` (or use `docs/about-page-template.txt` as a starting point)
- [ ] Update `pages/program.tsx` with the real schedule
- [ ] Update `pages/registry.tsx` with correct links
- [ ] Update `pages/qrcodeflyer.tsx` with correct event title, date, and upload URL
- [ ] Remove or update `docs/collins-may-wedding-client-001.md` (client brief from previous couple)
- [ ] Update `docs/GUEST-GUIDE.md` with correct couple names and file size limits

---

## Phase 2: Supabase Project

- [ ] Create a new Supabase project in the dashboard
- [ ] Record the project reference ID (`SUPABASE_PROJECT_REF`)
- [ ] Copy the project API URL and anon key (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- [ ] Copy the service role key (`SUPABASE_SERVICE_ROLE_KEY`) — never expose this in the browser
- [ ] Run migrations: `npm run db:push`
- [ ] Create the `wedding-photos` storage bucket (public: false)
- [ ] Confirm storage RLS policies allow:
  - Anon: INSERT into `uploads/<slug>/`
  - Service role: all operations
- [ ] Confirm table RLS policies allow:
  - `photos`: anon INSERT only for pending rows
  - `guestbook_entries`: anon INSERT only
  - Both: anon SELECT for approved rows only

---

## Phase 3: Cloudflare Worker

- [ ] Create or reuse a Cloudflare Workers account
- [ ] `cd worker && npm install`
- [ ] Update `worker/wrangler.jsonc` `"name"` field to match the new site slug
- [ ] Set all Worker secrets via `wrangler secret put`:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ADMIN_PASSWORD`
  - `CLIENT_PASSWORD`
  - `SITE_ORIGIN` (Vercel preview or production URL)
  - `ADMIN_ORIGIN` (same as SITE_ORIGIN or separate admin URL)
  - `HF_TOKEN` (optional — required for auto-moderation)
  - `SLACK_WEBHOOK_URL` (optional — required for weekly reports)
  - `RESTRICT_TO_MIDWEST` (optional — set "true" for regional restriction)
- [ ] Deploy: `cd worker && npx wrangler deploy`
- [ ] Verify: `GET https://<worker-url>/health` → `{"ok":true,"url":true,"key":true}`
- [ ] Record the Worker URL as `NEXT_PUBLIC_WORKER_BASE_URL`

---

## Phase 4: Vercel Deployment

- [ ] Import the repository into Vercel (or connect existing project)
- [ ] Set all `NEXT_PUBLIC_*` environment variables in Vercel project settings:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_WEDDING_SLUG`
  - `NEXT_PUBLIC_WORKER_BASE_URL`
  - `RESTRICT_TO_MIDWEST` (optional)
- [ ] Trigger a deploy (push to main or manual redeploy)
- [ ] Confirm build passes (check Vercel deploy logs)
- [ ] Test public pages: `/`, `/about`, `/gallery`, `/guestbook`, `/sendyourphotos`
- [ ] Test admin: `/admin` (correct password gates moderation queue)
- [ ] Test photo upload end-to-end (submit → pending → approve → appears in gallery)

---

## Phase 5: Content & QR Code

- [ ] Set custom domain in Vercel (if applicable)
- [ ] Update `pages/qrcodeflyer.tsx` with the final production URL
- [ ] Print and test QR code — scan it and confirm the upload page opens
- [ ] Review all page content (about, program, registry, contact) against client brief
- [ ] Share the site URL and admin password with the couple

---

## Phase 6: Pre-Launch Review

- [ ] Run all tests: `npm test` — all must pass
- [ ] Run Next.js build: `npm run build` — must complete without errors
- [ ] Run Worker TypeScript check: `cd worker && npx tsc --noEmit`
- [ ] Check `public/robots.txt` — confirm `Disallow: /` is present
- [ ] Confirm `.env.example` is updated and `.env.local` is NOT committed
- [ ] Review `docs/DEVELOPER.md` — update Worker URL and any site-specific notes
- [ ] Create a client brief doc at `docs/<slug>-client-001.md` (see `collins-may-wedding-client-001.md` as template)

---

## Post-Launch Monitoring

- [ ] Confirm weekly egress report is arriving (first Sunday after launch)
- [ ] Check admin queue after the event for photos/messages to approve
- [ ] Monitor Vercel + Cloudflare dashboards for unusual traffic
- [ ] Note any guest support requests for issues or photo removal
