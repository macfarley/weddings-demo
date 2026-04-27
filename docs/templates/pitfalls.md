# Common Pitfalls — Wedding Site Platform

Things that have bitten this project (or probably will). Check this when
debugging or before making structural changes.

---

## Architecture Pitfalls

### "Why is the gallery empty after I approve a photo?"

The gallery fetches from `/photos/approved` via the Worker. If it's empty:
1. The Worker's `SUPABASE_SERVICE_ROLE_KEY` secret is wrong or missing → `GET /health` returns `{"key":false}`.
2. The `wedding_slug` in the Worker response filter doesn't match `NEXT_PUBLIC_WEDDING_SLUG`.
3. RLS policies are blocking the service role (they shouldn't, but double-check if you edited them).

### "My CORS errors are 403, not 401"

The Worker returns 403 (not 401) when the `SITE_ORIGIN` / `ADMIN_ORIGIN` secrets don't match the requesting origin. If you see 403 in the browser network tab with no `Access-Control-Allow-Origin` header, check those secrets first, not the password.

### "Photos from one couple are showing on another couple's gallery"

The `wedding_slug` filter in the Worker is critical. Every `photos` and `guestbook_entries` row is scoped by `wedding_slug`. Make sure `NEXT_PUBLIC_WEDDING_SLUG` in Vercel and the Worker's query both reference the correct slug for this deployment.

### "The Worker works locally but 403s on Cloudflare"

Cloudflare geo/bot filtering runs only on Cloudflare infrastructure, not on `wrangler dev`. So local dev always passes geo checks. The most common production-only 403 causes:
- Your test machine's ASN is on the blocklist (run from a consumer ISP, not a VPS/datacenter)
- Cloudflare's bot score for your curl request is < 30 (normal browser traffic scores high)

### "Upload succeeds but photo never appears in pending queue"

The upload goes browser → Supabase Storage (`uploads/` prefix). The Worker only creates the `photos` metadata row — if the Worker `POST /photos` (metadata insert) fails silently, the file is in storage but has no DB row. Check `console.error` in the browser during upload.

---

## Development Pitfalls

### "TypeScript fails on `data ?? []` from Supabase"

Supabase JS returns `data | null | undefined | GenericStringError` depending on version. Use double casting:
```typescript
const photos = (data ?? []) as unknown as PhotoRow[];
```
Adding Supabase client generics helps if you define them at query time.

### "Tests pass locally but fail in CI"

Most likely a `fetch is not defined` in jsdom environment. Wrap fetch calls in the component and mock `fetch` in the test. See `gallery-worker.test.tsx` for the mock pattern.

### "next/server imports blow up in Jest"

`NextRequest` and `NextResponse` are edge-runtime APIs. Use `@jest-environment node` at the top of test files that import from `proxy.ts` or `next/server` directly.

### "supabase/functions/ breaks the tsc build"

Deno edge functions use a different runtime and `Deno` global types. Keep `supabase/functions/**` in `tsconfig.json` `exclude`. The Next.js build only checks `pages/`, `components/`, `lib/`, etc.

### "Worker cron jobs never fire during development"

`npx wrangler dev` does not fire scheduled cron events unless you trigger them manually:
```bash
curl "http://localhost:8787/__scheduled?cron=0+10+*+*+0"
```
Always test cron handlers separately from the main request handler.

---

## Content Pitfalls

### "Client gave me the wrong couple names after pages were printed"

The couple's names appear in multiple places:
- `pages/index.tsx` — hero section
- `pages/about.tsx` — bio section
- `pages/program.tsx` — schedule header
- `pages/qrcodeflyer.tsx` — QR code flyer title
- `docs/collins-may-wedding-client-001.md` — client brief filename
- `NEXT_PUBLIC_WEDDING_SLUG` — slug is baked into DB rows; a name change here requires a migration

Grep for the full first and last names before delivery.

### "The QR code on the printed flyer points to the preview URL, not production"

Always update `pages/qrcodeflyer.tsx` with the final production URL before printing. Preview/branch Vercel URLs expire and rotate. Add a note to the print job: "Check QR code destination before printing."

### "File size limit in the UI doesn't match validation"

`validatePhotoSubmission` enforces 5 MB max. The UI placeholder text and `GUEST-GUIDE.md` must say "5 MB" — not "10 MB". This has already been corrected once (2026-04); don't re-introduce the mismatch.

---

## Infrastructure Pitfalls

### "Egress costs are spiking"

1. Check Supabase storage analytics for unusually large downloads.
2. Check the Worker `/report` endpoint (admin token required) for per-day stats.
3. The weekly egress report should alert you automatically via Slack.
4. The most common cause: a scraper got past geo/bot filters and is bulk-downloading photos.
   → Add their ASN to the Worker ASN blocklist and update the `BAD_BOT_PATTERNS` list in `proxy.ts`.

### "Supabase free-tier row limit approaching"

The free tier has limits on rows and storage. Monitor in the Supabase dashboard. When migrating to a paid tier, the only change needed is in the service role key (no code changes).

### "Vercel Edge Function (proxy.ts) rate limit map is not shared across instances"

The in-memory rate limit map in `proxy.ts` is per-instance. Under high load, Vercel may spin up multiple instances and the rate limit won't be enforced globally. For global rate limiting, switch to Vercel KV or Upstash Redis. The current implementation is effective for organic traffic and low-volume abuse.

---

## Handoff Pitfalls

### "The couple wants photos after the event but the site has been deleted"

Export photos from the Supabase `approved/` storage prefix before deleting the project. Download a zip from the Supabase dashboard or use the CLI:
```bash
supabase storage cp -r ss:///wedding-photos/approved/<slug>/ ./export/
```

### "The admin password was shared too broadly"

The admin password grants full moderation and delete rights. Issue separate `CLIENT_PASSWORD` credentials for the couple to view pending content without delete access. If the admin password is compromised, rotate it via `wrangler secret put ADMIN_PASSWORD` — no redeploy needed.
