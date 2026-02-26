# Path Forward — Stable Placeholder to Live Deployment

**Date:** 2026-02-23  
**Project:** John & Crystal Wedding Site  
**Goal:** Deploy a reliable public placeholder now, then phase in full upload/moderation features.

---

## 1) Release Objective (Placeholder First)

Ship a **stable, honest, low-risk version** of the site that:
- Builds cleanly in production.
- Shows polished core public pages.
- Avoids fake-success workflows for unfinished backend features.
- Is safe to share publicly while full functionality is still in progress.

This is a launch for trust and reliability, not full feature completeness.

---

## 2) Current State Summary

### Confirmed Working
- Production build passes (`next build`).
- Static pages render and route correctly.
- Theme/palette system and navigation are functional.
- Gallery UI works with mock/static photos.

### Not Production-Ready Yet
- Supabase integration is a stub (`lib/supabase.ts`).
- Moderation API routes are stubs (`app/api/approve.ts`, `app/api/deny.ts`).
- Guestbook/photo forms are client-side only and do not persist data.
- Several pages still contain explicit placeholder copy (“coming soon”, “stub”).
- Photo upload rules are inconsistent in UI vs validation (file type/size mismatch).

---

## 3) Scope Freeze for Stable Placeholder (MVP)

For this deployment, treat the app as a **content-first wedding microsite**.

### Include in Placeholder Release
- Home
- About
- Program
- Event details (with real final copy)
- Gallery (static/mock approved photos)
- Under construction/supporting informational pages as needed

### Defer from Placeholder Release
- Live photo upload processing
- Live guestbook persistence
- Moderation approve/deny workflow
- Supabase-backed gallery updates

If a deferred page remains visible, it must clearly state “coming soon” and must **not** imply successful submission/storage.

---

## 4) Stabilization Work Plan (Before Deploy)

### Phase A — UX Honesty & Safety (Highest Priority)
1. Remove or disable any submit behavior that currently shows false success.
2. Replace unfinished interaction points with clear “feature coming soon” messaging.
3. Ensure nav only highlights pages that are accurate and presentable.

### Phase B — Content Polish
1. Replace placeholder/stub copy on event/contact/registry-related pages.
2. Normalize tone and formatting across pages.
3. Confirm date/time/location details are final and consistent.

### Phase C — Technical Cleanup
1. Keep build green (`npm run build`).
2. Remove stale lock artifacts before CI/deploy if needed.
3. Confirm no TypeScript/editor diagnostics.

---

## 5) Launch Gate Checklist (Definition of “Stable”)

A release is approved only if all are true:
- [ ] `npm run build` succeeds locally.
- [ ] No visible page claims backend functionality that does not exist.
- [ ] No form reports success unless data is actually saved.
- [ ] Nav links all resolve to intentional pages.
- [ ] Primary pages are mobile-usable and readable.
- [ ] Placeholder labels are explicit where features are deferred.
- [ ] Deployed preview URL verified manually before promoting to production.

---

## 6) Deployment Path

### Step 1 — Pre-Deploy
- Run build locally.
- Validate all public routes in a local dev pass.
- Validate copy/branding/date details one final time.

### Step 2 — Deploy Placeholder
- Deploy to Vercel production.
- Use a “placeholder live” status message internally.
- Share URL as public-facing temporary version.

### Step 3 — Post-Deploy Validation
- Smoke test routes on production domain.
- Confirm no broken links or dead-end forms.
- Confirm gallery and hero assets load correctly.

---

## 7) Phase 2 Roadmap (After Placeholder is Live)

### Track 1 — Data Layer
- Implement real Supabase client setup.
- Add environment variable management for local/prod.

### Track 2 — Upload Pipeline
- Implement upload API endpoint with server-side validation.
- Store uploads in `pending/` bucket path.
- Return real success/error responses.

### Track 3 — Moderation
- Implement approve/deny handlers.
- Move approved files to `approved/`.
- Archive/delete denied files.

### Track 4 — Guestbook Persistence
- Add backend endpoint for guestbook entries.
- Save sanitized entries to DB.
- Render approved entries from data source.

### Track 5 — Final Production Hardening
- Add lint/test scripts.
- Add basic observability (error logging).
- Add simple rollback checklist per release.

---

## 8) Suggested Execution Order (Practical)

1. Ship stable placeholder (this document’s MVP scope).  
2. Implement real upload backend.  
3. Implement moderation workflow.  
4. Implement persistent guestbook.  
5. Remove “coming soon” messaging and relaunch as full-featured version.

---

## 9) Decision Log

- **Decision:** Launch now as a stable placeholder instead of waiting for full backend completion.  
  **Reason:** Public credibility and momentum, with lower risk.  

- **Decision:** Prioritize honest UX over partial fake interactions.  
  **Reason:** Trust is more important than simulated completion.
