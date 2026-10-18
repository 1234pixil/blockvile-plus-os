-- ============================================================
-- Blockvile Updater <-> Blockvile OS link  (run once in Supabase → SQL Editor, after schema.sql)
-- The standalone Updater (its own website) signs in with the SAME Supabase project as the OS.
--   os_releases  the versions you have published (you add them with supabase/releases.sql)
--   os_status    each signed-in device reports which version it runs
--   os_requests  the Updater asks a device to switch/update; the device shows a card and only changes when the person taps
-- ============================================================
create table if not exists public.os_releases (
  version text primary key check (version ~ '^[0-9]+(\.[0-9]+){0,3}$'),
  build text not null,
  native int not null default 1,
  released date,
  notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.os_releases enable row level security;
drop policy if exists "signed-in users read releases" on public.os_releases;
create policy "signed-in users read releases" on public.os_releases for select to authenticated using (true);
revoke all on public.os_releases from anon, authenticated;
grant select on public.os_releases to authenticated;        -- only you (SQL Editor / service role) can add releases

create table if not exists public.os_status (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_key text not null,
  name text not null default 'Device',
  version text not null,
  build text,
  kind text,
  seen_at timestamptz not null default now(),
  primary key (user_id, device_key)
);
alter table public.os_status enable row level security;
drop policy if exists "own status" on public.os_status;
create policy "own status" on public.os_status for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.os_status from anon;
grant select, insert, update, delete on public.os_status to authenticated;

create table if not exists public.os_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_key text not null,
  version text not null check (version ~ '^[0-9]+(\.[0-9]+){0,3}$'),
  status text not null default 'pending' check (status in ('pending','done','dismissed')),
  created_at timestamptz not null default now()
);
create index if not exists os_requests_lookup on public.os_requests (user_id, device_key, status);
alter table public.os_requests enable row level security;
drop policy if exists "own requests" on public.os_requests;
create policy "own requests" on public.os_requests for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.os_requests from anon;
grant select, insert, update, delete on public.os_requests to authenticated;
