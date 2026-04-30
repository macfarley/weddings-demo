# Supabase → Neon + UploadThing Migration

> **Status:** Complete — shipped April 29, 2026  
> **Author:** Mac McCoy  
> **Commit:** `0e76790`

---

## Why We Left Supabase

This project was originally built on Supabase for its free-tier PostgreSQL and S3-compatible file storage. In late April 2026, Supabase suspended access to the project database during what they described as a security incident on their platform. Rather than restoring access, they required action from us before lifting the suspension — effectively holding our own production data hostage for a problem that originated on their infrastructure.

We were not willing to operate on a platform that can revoke data access unilaterally, without warning, and without immediate recourse. The decision was made to remove Supabase from the entire stack immediately.

This wasn't a performance complaint or a cost complaint. It was a trust failure.

---

## What We Replaced

| Before | After |
|--------|-------|
| Supabase PostgreSQL | Neon (serverless PostgreSQL) |
| Supabase Storage (S3-compatible) | UploadThing (already partially wired, completed here) |
| Supabase JS client (`@supabase/supabase-js`) | `@neondatabase/serverless` (tagged template SQL) |
| Supabase Edge Function (`egress-report`) | Cloudflare Worker cron (already existed) |
| Supabase service role key auth | `DATABASE_URL` connection string (server-only) |

All existing features were preserved through the migration:

- Guest photo upload and gallery
- Guestbook entries
- Admin moderation (approve/reject photos and guestbook entries)
- Love reactions (per-IP, deduped via `react_to_photo()` Postgres function)
- NSFW auto-moderation (HuggingFace, Cloudflare Worker)
- Weekly activity report (Cloudflare Worker cron → Slack)

---

## How We Did It

### Step 1 — Provision a new Neon project

Created a Neon project (`JohnCrystalMayWedding`, region `aws-us-east-2`, project ID `dawn-mode-48968592`) via the Neon dashboard.

We reconstructed the full schema from the existing Supabase migration files before deleting them — preserving `guestbook_entries`, `photos`, `photo_reactions`, and the `react_to_photo()` function. That schema was saved as `neon-schema.sql` at the repo root and applied via:

```bash
psql "$DATABASE_URL" -f neon-schema.sql
```

The schema is fully idempotent (`CREATE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) so it can be re-applied to new projects without error.

### Step 2 — Replace the database client

Removed `@supabase/supabase-js` from both the root `package.json` and `worker/package.json`. Installed `@neondatabase/serverless` (`^0.10.4` root, `^1.1.0` worker).

The Neon client uses tagged template literals:

```ts
const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`SELECT * FROM photos WHERE id = ${id}::uuid`;
```

Key differences from the Supabase client:
- No `{ data, error }` destructuring — Neon throws on error, so all calls are wrapped in try/catch
- COUNT queries require `::text` cast and `parseInt(row.count, 10)` — Neon returns counts as strings
- UUID parameters must be explicitly cast with `::uuid`
- The return type `NeonQueryPromise` doesn't overlap with `Promise<T>`, so complex type casts require `as unknown as Promise<T>`

### Step 3 — Move guestbook writes server-side

The old code used the Supabase browser client to insert guestbook entries directly from the user's browser. That pattern requires exposing the service role key (or anon key + RLS) to the client, which we wanted to eliminate.

Created `pages/api/guestbook.ts`: a Next.js API route that accepts a POST with validated JSON, inserts via Neon on the server, and returns a 201. The Neon `DATABASE_URL` never leaves the server environment. `pages/guestbook.tsx` was updated to POST to this route instead.

### Step 4 — Rewire the UploadThing server router

`server/uploadthing.ts` previously imported the Supabase service client to write photo metadata after a file upload completed. Replaced `getServiceClient()` with `getDb()` returning a Neon client, and updated `onUploadComplete` to insert via parameterized SQL. File references changed to `file.ufsUrl` (CDN URL) and `file.key` (stored as `storage_path`).

### Step 5 — Rewrite the Cloudflare Worker DB layer

`worker/src/index.ts` previously used the Supabase JS client for every database operation. This was a full rewrite:

- `WorkerEnv` now has `DATABASE_URL` only (removed `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- `getClient()` replaced with `getDb()` returning `neon(env.DATABASE_URL)`
- Every DB call converted to Neon tagged template SQL with try/catch
- `GET /health` checks `Boolean(env.DATABASE_URL)` → `{ ok: true, db: true }`
- Daily cron: replaced Supabase REST keepalive with `SELECT 1`
- `POST /photos/react`: replaced `.rpc('react_to_photo', ...)` with `SELECT react_to_photo(${id}::uuid, ${hash}) as love_count`
- Fixed cron schedule `0 10 * * 0` → `0 10 * * SUN` (Cloudflare rejects numeric weekday `0`, error code 10100)

### Step 6 — Delete Supabase from the repo

Removed the entire `supabase/` directory:
- `config.toml`
- `migrations/` (4 files, full schema history)
- `pipeline_test.py`
- `storage.ts`
- `functions/egress-report/index.ts`
- `setup-live.sql`
- `README.md`

Removed from `package.json`:
- `@supabase/supabase-js` dependency
- `supabase` devDependency
- `db:start`, `db:stop`, `db:reset`, `db:push`, `db:pull`, `db:migration:new` scripts

### Step 7 — Set secrets and verify

Wrote `DATABASE_URL` and `UPLOADTHING_TOKEN` to:
- `.env.local` (local dev)
- Vercel project environment variables
- Wrangler secrets (`wrangler secret put`)

Verified the deployed Worker:
```bash
curl https://worker.therealmccoyster.workers.dev/health
# → {"ok":true,"db":true}
```

---

## Testing

### Unit + integration tests (Jest)

The existing test suite had Supabase-specific assumptions that needed to be corrected:

**`guestbook-validation.test.tsx`** — previously mocked `lib/supabase`. Rewritten to mock `global.fetch` instead. Assertions changed from `expect(fetchMock).not.toHaveBeenCalled()` to `expect(fetchMock).not.toHaveBeenCalledWith('/api/guestbook', ...)` because the guestbook page fires a load-time Worker fetch on mount (to load existing entries), so `fetch` is always called — just not to the API insert endpoint.

**`guestbook-upload.test.tsx`** — rewritten as a single form submission test via fetch mock. All Supabase storage assertions removed.

Result: **52/52 tests passing** across 8 suites.

### End-to-end tests (Playwright)

Added a Playwright e2e test suite after the migration to verify the full request chain against production. Tests are split into two files:

**`e2e/smoke.spec.ts`** — read-only, always runs in CI, completes in ~9 seconds:

| Test | What it verifies |
|------|-----------------|
| Worker `/health` | Neon connection alive, Worker secrets present |
| Worker `/photos/approved` | Gallery data API returns valid JSON envelope |
| Worker `/guestbook/approved` | Guestbook data API returns valid JSON envelope |
| Gallery page loads | Next.js SSR succeeds, no crash page rendered |
| Gallery fires Worker request | `NEXT_PUBLIC_WORKER_BASE_URL` is wired in the Vercel build |

**`e2e/upload.spec.ts`** — writes to production, guarded by `RUN_UPLOAD_TEST=1`:

| Test | What it verifies |
|------|-----------------|
| Upload form → success toast | UploadThing accepts file, Neon INSERT succeeds, photo sits as `pending` (invisible until moderated) |
| POST `/api/guestbook` | API route returns 201, Neon INSERT succeeds |

Test data is identifiable: `uploader_name = 'E2E TestRunner'` and `family_name = 'CI Bot'`. Safe to delete from the admin panel.

### GitHub Actions CI

Added `.github/workflows/e2e.yml`:
- Smoke tests run automatically on every push to `main` and every PR
- Upload tests only run on manual dispatch (`workflow_dispatch` with `run_upload_test=true`)
- Playwright report and screenshots uploaded as artifacts on failure
- Single Chromium worker, serial execution (stays under the Worker's rate limit)

---

## Lessons Learned

**Don't expose database credentials to browsers.** The old Supabase pattern (anon key + RLS in the browser) works until you need to change providers — then you're rewriting client-side code that should have been server-side all along. `pages/api/guestbook.ts` is the pattern we should have used from the start.

**Schema history is valuable even when the platform is gone.** We were able to reconstruct the full `neon-schema.sql` from the Supabase migration files before deleting them. If we'd nuked the repo first, we'd have had to reverse-engineer the schema from a live database dump. Keep your migration files until you've applied the reconstructed schema to the new platform.

**Free-tier hosted services own the off switch.** Neon's free tier has the same theoretical risk. The difference is that Neon's `DATABASE_URL` connection string is portable — you can point it at any PostgreSQL-compatible host with no code changes. We're not locked in the same way.

**Test the real path.** The Jest suite only covers unit behavior. The Playwright smoke tests catch the integration failure that would have been invisible in unit tests: "does `NEXT_PUBLIC_WORKER_BASE_URL` actually reach the deployed Worker?" That five-test suite runs in 9 seconds and would have caught the misconfigured Vercel Root Directory issue before it reached users.

---

## Related Documents

- [docs/DEVELOPER.md](DEVELOPER.md) — current architecture, env vars, deployment runbook
- [docs/new-client-setup-guide.md](new-client-setup-guide.md) — provisioning a new couple on Neon + UploadThing
- [docs/devlog.md](devlog.md) — session-by-session development notes
