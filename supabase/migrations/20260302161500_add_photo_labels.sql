-- Add user-facing and sanitized label fields for uploaded photos.
-- label_raw preserves exactly what guest typed.
-- label_slug stores deterministic safe slug for UX/download naming.

alter table if exists public.photos
  add column if not exists label_raw text;

alter table if exists public.photos
  add column if not exists label_slug text;

-- Keep slug length bounded and non-empty when provided.
alter table if exists public.photos
  drop constraint if exists photos_label_slug_len;

alter table if exists public.photos
  add constraint photos_label_slug_len
  check (
    label_slug is null
    or (char_length(label_slug) between 1 and 120)
  );
