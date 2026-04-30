-- Neon schema for JohnCrystalMayWedding
-- Consolidated from git history of supabase/migrations/
-- Safe to run multiple times (all CREATE IF NOT EXISTS)

create extension if not exists pgcrypto;

-- ── Timestamp trigger ──────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── guestbook_entries ──────────────────────────────────────────────────────
create table if not exists public.guestbook_entries (
  id           uuid        primary key default gen_random_uuid(),
  wedding_slug text        not null,
  display_name text,
  family_name  text,
  message      text        not null,
  side         text,
  is_visible   boolean     not null default true,
  created_at   timestamptz not null default now(),
  constraint guestbook_message_len      check (char_length(message) between 1 and 1000),
  constraint guestbook_display_name_len check (display_name is null or char_length(display_name) <= 120),
  constraint guestbook_family_name_len  check (family_name  is null or char_length(family_name)  <= 120)
);

create index if not exists guestbook_entries_wedding_slug_idx on public.guestbook_entries (wedding_slug);
create index if not exists guestbook_entries_created_at_idx   on public.guestbook_entries (created_at desc);

-- Add side column if upgrading from older schema
alter table public.guestbook_entries add column if not exists side text;

-- ── photos ─────────────────────────────────────────────────────────────────
create table if not exists public.photos (
  id                uuid        primary key default gen_random_uuid(),
  wedding_slug      text        not null,
  storage_path      text        not null unique,
  file_url          text,
  label_raw         text,
  label_slug        text,
  original_filename text,
  uploader_name     text,
  caption           text,
  status            text        not null default 'pending',
  risk_score        numeric(4,3),
  is_visible        boolean     not null default false,
  love_count        int         not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  reviewed_at       timestamptz,
  reviewed_by       text,
  moderation_note   text,
  constraint photos_status_check       check (status in ('pending', 'approved', 'rejected', 'flagged')),
  constraint photos_risk_score_check   check (risk_score is null or (risk_score >= 0 and risk_score <= 1)),
  constraint photos_caption_len        check (caption       is null or char_length(caption)       <= 1000),
  constraint photos_uploader_name_len  check (uploader_name is null or char_length(uploader_name) <= 120),
  constraint photos_label_slug_len     check (label_slug    is null or (char_length(label_slug) between 1 and 120))
);

create index if not exists photos_wedding_slug_idx on public.photos (wedding_slug);
create index if not exists photos_status_idx       on public.photos (status);
create index if not exists photos_created_at_idx   on public.photos (created_at desc);
create index if not exists photos_love_count_idx   on public.photos (love_count desc) where status = 'approved';

drop trigger if exists photos_set_updated_at on public.photos;
create trigger photos_set_updated_at
  before update on public.photos
  for each row execute function public.set_updated_at();

-- Add columns if upgrading from older schema
alter table public.photos add column if not exists file_url   text;
alter table public.photos add column if not exists label_raw  text;
alter table public.photos add column if not exists label_slug text;
alter table public.photos add column if not exists love_count int not null default 0;

-- ── photo_reactions ────────────────────────────────────────────────────────
create table if not exists public.photo_reactions (
  photo_id   uuid        not null references public.photos(id) on delete cascade,
  ip_hash    text        not null,
  created_at timestamptz not null default now(),
  primary key (photo_id, ip_hash)
);

create index if not exists photo_reactions_photo_id_idx on public.photo_reactions (photo_id);

-- ── react_to_photo() ───────────────────────────────────────────────────────
create or replace function public.react_to_photo(p_photo_id uuid, p_ip_hash text)
returns int language plpgsql as $$
declare
  v_love_count int;
begin
  insert into public.photo_reactions(photo_id, ip_hash)
  values (p_photo_id, p_ip_hash)
  on conflict (photo_id, ip_hash) do nothing;

  if found then
    update public.photos
    set love_count = love_count + 1
    where id = p_photo_id
    returning love_count into v_love_count;
  else
    select love_count into v_love_count
    from public.photos
    where id = p_photo_id;
  end if;

  return coalesce(v_love_count, 0);
end;
$$;
