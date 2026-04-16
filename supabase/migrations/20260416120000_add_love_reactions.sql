-- Add love reactions to photos
-- Guests can "love" a photo (1 per IP per photo, enforced by unique constraint on ip_hash)

-- ── 1. love_count column on photos ──────────────────────────────────────────
alter table public.photos
  add column if not exists love_count int not null default 0;

create index if not exists photos_love_count_idx
  on public.photos (love_count desc)
  where status = 'approved';

-- ── 2. Reaction log (stores hashed IP so the same address can't love twice) ──
-- ip_hash is SHA-256 of "<photo_id>:<raw_ip>" — not reversible, no PII stored.
create table if not exists public.photo_reactions (
  photo_id   uuid        not null references public.photos(id) on delete cascade,
  ip_hash    text        not null,
  created_at timestamptz not null default now(),
  primary key (photo_id, ip_hash)
);

create index if not exists photo_reactions_photo_id_idx
  on public.photo_reactions (photo_id);

alter table public.photo_reactions enable row level security;

-- Service role (Worker) handles all writes — block direct public access.
-- No anon policies: all inserts go through the react_to_photo() function below.

-- ── 3. Atomic RPC: insert reaction + increment counter in one transaction ────
-- Returns the (potentially unchanged) love_count after the operation.
-- Duplicate IPs are silently ignored; count stays the same.
create or replace function public.react_to_photo(p_photo_id uuid, p_ip_hash text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_love_count int;
begin
  -- Attempt to record the reaction; skip silently if already exists.
  insert into public.photo_reactions(photo_id, ip_hash)
  values (p_photo_id, p_ip_hash)
  on conflict (photo_id, ip_hash) do nothing;

  if found then
    -- New reaction: increment the counter atomically.
    update public.photos
    set love_count = love_count + 1
    where id = p_photo_id
    returning love_count into v_love_count;
  else
    -- Duplicate: return current count unchanged.
    select love_count into v_love_count
    from public.photos
    where id = p_photo_id;
  end if;

  return coalesce(v_love_count, 0);
end;
$$;

grant execute on function public.react_to_photo to service_role;
