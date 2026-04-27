# Deployment Security Checklist

Run through this before every production deploy and after every new-couple setup.

---

## Secrets and Environment Variables

- [ ] `.env.local` is in `.gitignore` — confirm it is NOT in the repository
- [ ] No secrets are in `NEXT_PUBLIC_*` variables (those are client-exposed)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is only in Cloudflare Worker secrets and server-side code
- [ ] `ADMIN_PASSWORD` is set in Worker secrets (not hardcoded anywhere)
- [ ] `HF_TOKEN` is set if auto-moderation is enabled
- [ ] Worker `SITE_ORIGIN` and `ADMIN_ORIGIN` are correct (CORS will block other origins)

## Geo and Bot Filtering

- [ ] `proxy.ts` is the edge config — confirm it's at repo root (not inside `/pages` or `/app`)
- [ ] `proxy.ts` `config.matcher` covers all routes
- [ ] `BAD_BOT_PATTERNS` is up to date — review quarterly for new AI crawler UAs
- [ ] `RESTRICT_TO_MIDWEST=true` is set if the event is regional (or leave unset for US-only)
- [ ] Worker ASN blocklist reviewed — add new datacenter ASNs if scraping is detected

## Database and Storage

- [ ] Supabase RLS policies are enabled for all tables
- [ ] `photos` table: anon can only INSERT pending rows, SELECT approved rows
- [ ] `guestbook_entries`: anon can only INSERT; service role handles approval
- [ ] `wedding-photos` storage bucket: NOT publicly accessible (private bucket)
- [ ] Signed URLs expire in ≤ 24 hours (Worker controls this)
- [ ] No raw file paths or bucket names are exposed in client-side responses

## Next.js / Vercel

- [ ] `public/robots.txt` has `Disallow: /`
- [ ] `proxy.ts` adds `X-Robots-Tag: noindex` to all responses
- [ ] `vercel.json` has correct cache headers (static: 1yr, photos: 1day, pages: no-cache)
- [ ] No API routes in `pages/api/` or `app/api/` that bypass the Worker auth layer
- [ ] Input validation (`validatePhotoSubmission`, `validateGuestbookEntry`) is in place and exported for testing

## Post-Deploy Verification

- [ ] `GET /health` on the Worker returns `{"ok":true,"url":true,"key":true}`
- [ ] Photo upload end-to-end test (submit → Worker NSFW check → admin approval → gallery)
- [ ] Guestbook submission end-to-end test
- [ ] Admin auth test: wrong password → shows error; correct password → loads queue
- [ ] Gallery pagination: loads page 1, next page works, sort toggle works
- [ ] QR code: scan the printed flyer → correct page opens
