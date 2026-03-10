-- Schema-only migration for guestbook_entries and photos tables

create extension if not exists pgcrypto;

-- Keep timestamps up to date
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Guestbook messages submitted by guests
create table if not exists public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  wedding_slug text not null,
  display_name text,
  family_name text,
  message text not null,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  constraint guestbook_message_len check (char_length(message) between 1 and 1000),
  constraint guestbook_display_name_len check (display_name is null or char_length(display_name) <= 120),
  constraint guestbook_family_name_len check (family_name is null or char_length(family_name) <= 120)
);

create index if not exists guestbook_entries_wedding_slug_idx
  on public.guestbook_entries (wedding_slug);

create index if not exists guestbook_entries_created_at_idx
  on public.guestbook_entries (created_at desc);

alter table public.guestbook_entries enable row level security;

-- Guests can submit entries without auth
drop policy if exists "guestbook_anon_insert" on public.guestbook_entries;
create policy "guestbook_anon_insert"
on public.guestbook_entries
for insert
to anon, authenticated
with check (true);

-- Public can read only visible entries
drop policy if exists "guestbook_public_select_visible" on public.guestbook_entries;
create policy "guestbook_public_select_visible"
on public.guestbook_entries
for select
to anon, authenticated
using (is_visible = true);

-- Metadata for uploaded photos (file binary lives in Supabase Storage)
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  wedding_slug text not null,
  storage_path text not null unique,
  original_filename text,
  uploader_name text,
  caption text,
  status text not null default 'pending',
  risk_score numeric(4,3),
  is_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  moderation_note text,
  constraint photos_status_check check (status in ('pending', 'approved', 'rejected', 'flagged')),
  constraint photos_risk_score_check check (risk_score is null or (risk_score >= 0 and risk_score <= 1)),
  constraint photos_caption_len check (caption is null or char_length(caption) <= 1000),
  constraint photos_uploader_name_len check (uploader_name is null or char_length(uploader_name) <= 120)
);

create index if not exists photos_wedding_slug_idx
  on public.photos (wedding_slug);

create index if not exists photos_status_idx
  on public.photos (status);

create index if not exists photos_created_at_idx
  on public.photos (created_at desc);

drop trigger if exists photos_set_updated_at on public.photos;
create trigger photos_set_updated_at
before update on public.photos
for each row
execute function public.set_updated_at();

alter table public.photos enable row level security;

-- Guests can create only pending photo metadata
drop policy if exists "photos_anon_insert_pending" on public.photos;
create policy "photos_anon_insert_pending"
on public.photos
for insert
to anon, authenticated
with check (
  status = 'pending'
  and is_visible = false
);

-- Public gallery reads only approved + visible metadata
drop policy if exists "photos_public_select_approved" on public.photos;
create policy "photos_public_select_approved"
on public.photos
for select
to anon, authenticated
using (
  status = 'approved'
  and is_visible = true
);