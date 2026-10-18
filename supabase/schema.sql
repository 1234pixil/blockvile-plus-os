-- Blockvile Plus OS — Supabase setup. Paste this whole file into Supabase → SQL Editor → Run. Safe to run again.
-- Everything is locked to the signed-in user with Row Level Security. The Digital SIM only exists for signed-in users.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_key text not null,            -- random id kept on that device
  name text not null,
  platform text,
  linked_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (user_id, device_key)
);

-- The Digital SIM: one per account. "charge" is 0-100 and fills while the device is on Wi-Fi (see also data_mb below).
create table if not exists public.sims (
  user_id uuid primary key references auth.users(id) on delete cascade,
  number text not null unique,         -- a Blockvile number such as BV 4821 7730 (not a phone-company number)
  charge numeric not null default 50 check (charge between 0 and 100),
  charged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Wi-Fi data: a bank of data (in MB) that fills while the device is on Wi-Fi and is spent by SIM messages when it is not.
alter table public.sims add column if not exists data_mb numeric not null default 100;
alter table public.sims drop constraint if exists sims_data_mb_check;
alter table public.sims add constraint sims_data_mb_check check (data_mb between 0 and 500);

create table if not exists public.sim_messages (
  id bigint generated always as identity primary key,
  from_number text not null,
  to_number text not null,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists sim_messages_to on public.sim_messages (to_number, created_at desc);
create index if not exists sim_messages_from on public.sim_messages (from_number, created_at desc);

alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.sims enable row level security;
alter table public.sim_messages enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "own devices" on public.devices;
create policy "own devices" on public.devices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own sim read" on public.sims;
create policy "own sim read" on public.sims for select using (auth.uid() = user_id);   -- changes only through the functions below
drop policy if exists "own messages read" on public.sim_messages;
create policy "own messages read" on public.sim_messages for select using (
  from_number = (select number from public.sims where user_id = auth.uid())
  or to_number = (select number from public.sims where user_id = auth.uid()));

-- Create the profile row when someone signs up (email, Google or Microsoft)
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Get this account's SIM (creates it the first time). Works only when signed in.
create or replace function public.sim_get() returns public.sims language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s public.sims; n text; tries int := 0;
begin
  if me is null then raise exception 'Sign in to use the Digital SIM'; end if;
  select * into s from public.sims where user_id = me;
  if found then return s; end if;
  loop
    n := 'BV ' || lpad((floor(random()*10000))::int::text, 4, '0') || ' ' || lpad((floor(random()*10000))::int::text, 4, '0');
    begin
      insert into public.sims (user_id, number) values (me, n) returning * into s;
      return s;
    exception when unique_violation then
      tries := tries + 1; if tries > 20 then raise exception 'Could not make a number, try again'; end if;
    end;
  end loop;
end $$;

-- Charge the SIM and bank Wi-Fi data. Counted only when the device says it's on Wi-Fi.
--   charge: +1% a minute (max 100%)      Wi-Fi data: +5 MB a minute (max 500 MB)      at most 4 hours counted per check-in
create or replace function public.sim_charge(on_wifi boolean) returns public.sims language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s public.sims; mins numeric;
begin
  if me is null then raise exception 'Sign in to use the Digital SIM'; end if;
  perform public.sim_get();
  select * into s from public.sims where user_id = me for update;
  mins := least(extract(epoch from (now() - s.charged_at)) / 60, 240);
  update public.sims
     set charge = case when on_wifi then least(100, charge + mins) else charge end,
         data_mb = case when on_wifi then least(500, data_mb + mins * 5) else data_mb end,
         charged_at = now()
   where user_id = me returning * into s;
  return s;
end $$;

-- Send a message to another Blockvile number. Uses 2% charge. When NOT on Wi-Fi it also uses 2 MB of banked Wi-Fi data.
drop function if exists public.sim_send(text, text);
create or replace function public.sim_send(to_number text, body text, on_wifi boolean default true) returns public.sim_messages language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s public.sims; m public.sim_messages; clean text := trim(body); dest text := upper(regexp_replace(trim(to_number), '\s+', ' ', 'g'));
begin
  if me is null then raise exception 'Sign in to use the Digital SIM'; end if;
  if clean is null or clean = '' then raise exception 'Write a message first'; end if;
  select * into s from public.sims where user_id = me for update;
  if not found then raise exception 'No SIM yet'; end if;
  if s.charge < 2 then raise exception 'Your SIM is out of charge. Connect to Wi-Fi to charge it.'; end if;
  if not on_wifi and s.data_mb < 2 then raise exception 'Out of Wi-Fi data. Join Wi-Fi to bank more.'; end if;
  if not exists (select 1 from public.sims where number = dest) then raise exception 'No Blockvile number %', dest; end if;
  update public.sims set charge = charge - 2, data_mb = case when on_wifi then data_mb else data_mb - 2 end where user_id = me;
  insert into public.sim_messages (from_number, to_number, body) values (s.number, dest, left(clean, 1000)) returning * into m;
  return m;
end $$;

revoke all on function public.sim_get(), public.sim_charge(boolean), public.sim_send(text, text, boolean) from public, anon;
grant execute on function public.sim_get(), public.sim_charge(boolean), public.sim_send(text, text, boolean) to authenticated;

-- Feedback from the Feedback app. Anyone (signed in or not) can SEND feedback; nobody can read it through the app.
-- You read it in Supabase → Table Editor → feedback.
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  type text not null check (char_length(type) <= 40),
  rating int check (rating between 1 and 5),
  message text not null check (char_length(message) between 1 and 4000),
  contact text check (char_length(contact) <= 200),
  device text check (char_length(device) <= 1500),
  app_version text check (char_length(app_version) <= 20),
  user_id uuid default auth.uid()
);
alter table public.feedback enable row level security;
drop policy if exists "anyone can send feedback" on public.feedback;
create policy "anyone can send feedback" on public.feedback for insert to anon, authenticated with check (true);
grant insert on public.feedback to anon, authenticated;

-- Live updates for incoming messages
do $$ begin
  alter publication supabase_realtime add table public.sim_messages;
exception when others then null; end $$;

-- YouTube daily quota counters (used only by the `youtube` Edge Function, with the service role).
-- Nobody can read or change this table from the app; it just stops one person using up your free YouTube quota.
create table if not exists public.yt_usage (
  day date not null default current_date,
  who text not null,
  units int not null default 0,
  primary key (day, who)
);
alter table public.yt_usage enable row level security;      -- no policies: the app can't touch it
revoke all on public.yt_usage from anon, authenticated;
create or replace function public.yt_hit(who text, units int, cap int) returns boolean language plpgsql security definer set search_path = public as $$
declare used int;
begin
  insert into public.yt_usage as u (day, who, units) values (current_date, who, units)
  on conflict (day, who) do update set units = u.units + excluded.units
  returning u.units into used;
  delete from public.yt_usage where day < current_date - 7;
  return used <= cap;
end $$;
revoke all on function public.yt_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.yt_hit(text, int, int) to service_role;

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
