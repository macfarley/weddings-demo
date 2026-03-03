# Content Moderation System

This document outlines the moderation workflow for guest-uploaded photos on the wedding site. The goal is to keep the gallery safe and respectful while preserving couple control over final decisions.

## 1) Moderation goals
- Protect guests and families from inappropriate content.
- Avoid over-censoring or making assumptions about context.
- Support fast day-of moderation and post-event cleanup.
- Maintain a production-minded workflow suitable for portfolio review.

## 2) Upload flow overview
1. Guest uploads photo on `/sendyourphotos`.
2. File is stored in Supabase Storage (`uploads/` path).
3. Metadata is inserted into `photos` with `status='pending'` and `is_visible=false`.
4. Admin reviews pending items in `/admin`.
5. Approved photos move to `approved/` and become visible in public gallery reads.
6. Rejected photos are removed/hidden and not shown publicly.

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
- Review pending photos and guestbook entries.
- Approve/reject entries individually.
- Use stats to track moderation backlog.
- Use auth modal fallback when protected requests return `401/403`.

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
