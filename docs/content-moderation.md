# Content Moderation System

This document outlines the moderation workflow for guest-uploaded photos on the wedding site. The goal is to keep the gallery safe and respectful while preserving couple control over final decisions.

## 1) Moderation goals
- Protect guests and families from inappropriate content.
- Avoid over-censoring or making assumptions about context.
- Support fast day-of moderation and post-event cleanup.
- Maintain a production-minded workflow suitable for portfolio review.

## 2) Upload flow overview

### Photos
1. Guest uploads photo on `/sendyourphotos`.
2. File stored via UploadThing; metadata inserted into `photos` with `status='pending'`, `is_visible=false`.
3. Cloudflare Worker cron (`*/2 * * * *`) runs HuggingFace NSFW classifier:
   - Score ≥ 0.95 → `status='rejected'`, `is_visible=false` (auto-trash, visible in admin Trash panel)
   - Score < 0.95 → `status='approved'`, `is_visible=true` (auto-approved, visible in gallery immediately)
   - Classifier unavailable → stays `pending` for manual admin review
4. Admin can manually approve pending photos or trash approved ones from `/admin`.

### Guestbook entries
1. Guest submits message on `/guestbook`.
2. Text passes server-side XSS/injection filter (script tags, `javascript:`, event-handler patterns).
3. Entry inserted with `is_visible=true` — **appears immediately** in the public guestbook.
4. Admin can hide any entry from `/admin` (✕ → confirm → `is_visible=false`).
5. Permanent deletion requires full admin password.

## 3) Current route model
### Public reads (no admin auth)
- `GET /photos/approved`
- `GET /guestbook/approved`

### Protected moderation routes
- `GET /photos/pending`
- `POST /photos/approve`
- `POST /photos/reject`
- `GET /guestbook/pending`
- `POST /guestbook/approve`
- `POST /guestbook/delete`
- `GET /admin/stats`

## 4) Admin workflow

The `/admin` dashboard has four panels:

| Panel | Contents | Actions |
|-------|----------|---------|
| ✓ Gallery — Approved | All publicly visible photos | ✕ trash (confirm required) |
| ⏳ Pending | Photos awaiting classification | ✓ approve, ✕ trash |
| 🗑 Trash | Rejected / auto-flagged photos | ✕ purge (admin only, confirm required) |
| 💬 All Guestbook Entries | Every message, visible or hidden | ✕ hide (confirm); purge hidden entries (admin only) |

All destructive actions use a red ✕ → **"Are you sure?"** inline confirm before executing. Nothing can be accidentally deleted.

## 5) Data and labeling
Photo metadata supports:
- `label_raw`: exact user-entered label text
- `label_slug`: sanitized slug-safe variant
- `original_filename`, `uploader_name`, `caption`, `storage_path`

Migration:
- `supabase/migrations/20260302161500_add_photo_labels.sql`

## 6) Safety principles
- No pending content is publicly visible.
- Public gallery/guestbook reads return only approved/visible records.
- Admin endpoints remain protected in production.
- Manual moderation is the final gate for publication.

## 7) Day-of support pattern
- Batch through obvious approvals first.
- Resolve ambiguous submissions manually.
- Leave low-priority rejects for follow-up if needed.

## 8) Portfolio value
This system demonstrates:
- UGC moderation pipeline design
- clear public/protected API separation
- admin tooling and review operations
- safe publishing controls for event content
