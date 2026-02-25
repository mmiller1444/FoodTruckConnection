-- Food Truck Booking schema (MVP)
-- Safe to run in Supabase SQL editor.

create extension if not exists "pgcrypto";

-- PROFILES (one row per auth user)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text check (role in (''truck_owner'',''business_owner'',''admin'')),
  created_at timestamptz not null default now()
);

-- Create a profile automatically on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>''full_name'',''''), null)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- TRUCKS
-- MVP: one truck per owner. Extend to multiple trucks by allowing many rows per owner_id.
create table if not exists public.trucks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(owner_id)
);

-- BUSINESS PROFILE (optional table for extra fields later)
create table if not exists public.businesses (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- REQUESTS
create type public.request_status as enum (''pending'',''accepted'',''ignored'',''cancelled'');

create table if not exists public.truck_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_id uuid not null references public.profiles(id) on delete cascade,

  requested_truck_id uuid null references public.trucks(id) on delete set null,
  blanket_request boolean not null default true,

  start_time timestamptz not null,
  end_time timestamptz not null,

  location_name text not null,
  location_lat double precision null,
  location_lng double precision null,

  notes text null,

  status public.request_status not null default ''pending'',
  accepted_truck_id uuid null references public.trucks(id) on delete set null
);

-- Basic guard: no more than 3 months in the future
create or replace function public.ensure_request_within_3_months()
returns trigger
language plpgsql
as $$
begin
  if NEW.start_time > (now() + interval ''3 months'') then
    raise exception ''Requests are limited to up to 3 months in advance'';
  end if;
  if NEW.end_time <= NEW.start_time then
    raise exception ''End time must be after start time'';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_request_time_guard on public.truck_requests;
create trigger trg_request_time_guard
before insert or update on public.truck_requests
for each row execute procedure public.ensure_request_within_3_months();

-- NOTIFICATIONS (simple inbox)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid references public.truck_requests(id) on delete cascade,
  message text not null,
  is_read boolean not null default false
);

-- RELEASES (change control / rollback via feature/config versions)
create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid null references public.profiles(id) on delete set null,
  version text not null,
  notes text null,
  features jsonb not null default ''{}''::jsonb,
  is_active boolean not null default false
);

create table if not exists public.release_changes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_id uuid references public.profiles(id) on delete set null,
  from_release_id uuid references public.releases(id) on delete set null,
  to_release_id uuid references public.releases(id) on delete set null,
  reason text
);

create or replace function public.activate_release(p_release_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_from uuid;
begin
  select id into v_from from public.releases where is_active = true limit 1;
  update public.releases set is_active = false where is_active = true;
  update public.releases set is_active = true where id = p_release_id;

  insert into public.release_changes(admin_id, from_release_id, to_release_id, reason)
  values (auth.uid(), v_from, p_release_id, ''Activated via admin UI'');
end;
$$;

-- VIEWS for truck inbox + public map
create or replace view public.truck_requests_inbox as
select
  r.id as request_id,
  t.id as truck_id,
  r.start_time,
  r.end_time,
  r.location_name,
  r.notes
from public.truck_requests r
join public.trucks t on t.owner_id is not null
where r.status = ''pending''
  and (
    r.blanket_request = true
    or r.requested_truck_id = t.id
  );

create or replace view public.truck_requests_inbox_all as
select
  r.id as request_id,
  t.id as truck_id,
  r.status,
  r.start_time,
  r.end_time,
  r.location_name,
  r.notes
from public.truck_requests r
join public.trucks t on t.owner_id is not null
where
  (r.blanket_request = true or r.requested_truck_id = t.id);

create or replace view public.public_bookings as
select
  r.id as request_id,
  t.display_name as truck_name,
  r.start_time,
  r.end_time,
  r.location_name,
  r.location_lat,
  r.location_lng
from public.truck_requests r
join public.trucks t on t.id = r.accepted_truck_id
where r.status = ''accepted'';

-- RPCs for truck accept/ignore
create or replace function public.accept_truck_request(p_request_id uuid, p_truck_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.truck_requests
  set status = ''accepted'', accepted_truck_id = p_truck_id
  where id = p_request_id
    and status = ''pending''
    and (
      blanket_request = true
      or requested_truck_id = p_truck_id
    );
end;
$$;

create or replace function public.ignore_truck_request(p_request_id uuid, p_truck_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.truck_requests
  set status = ''ignored''
  where id = p_request_id
    and status = ''pending''
    and (
      blanket_request = true
      or requested_truck_id = p_truck_id
    );
end;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.trucks enable row level security;
alter table public.businesses enable row level security;
alter table public.truck_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.releases enable row level security;
alter table public.release_changes enable row level security;

-- profiles: user can read/update self; admins read all
create policy "profiles_select_self" on public.profiles
for select using (auth.uid() = id);

create policy "profiles_update_self" on public.profiles
for update using (auth.uid() = id);

create policy "profiles_admin_all" on public.profiles
for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''admin''));

create policy "profiles_admin_update" on public.profiles
for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''admin''));

-- trucks: owner manages own; everyone can read active trucks (for request dropdown)
create policy "trucks_select_active" on public.trucks
for select using (is_active = true);

create policy "trucks_owner_all" on public.trucks
for all using (owner_id = auth.uid());

-- businesses: owner manages own
create policy "business_owner_all" on public.businesses
for all using (owner_id = auth.uid());

-- requests: business creates/reads own
create policy "requests_insert_business" on public.truck_requests
for insert with check (business_id = auth.uid());

create policy "requests_select_business" on public.truck_requests
for select using (business_id = auth.uid());

-- Truck owners can view requests that target them (blanket or specific)
create policy "requests_select_truck_owner" on public.truck_requests
for select using (
  exists (
    select 1 from public.trucks t
    where t.owner_id = auth.uid()
      and (truck_requests.blanket_request = true or truck_requests.requested_truck_id = t.id)
  )
);

-- Admin can read all requests
create policy "requests_admin_all" on public.truck_requests
for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''admin''));

-- notifications: user reads own
create policy "notifications_self" on public.notifications
for select using (user_id = auth.uid());

-- releases: admins manage; everyone can read active release metadata (optional)
create policy "releases_select_active" on public.releases
for select using (is_active = true);

create policy "releases_admin_all" on public.releases
for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''admin''));

create policy "release_changes_admin_select" on public.release_changes
for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''admin''));

-- Seed: create baseline release (safe if already exists)
insert into public.releases(version, notes, is_active)
select ''1.0.0'', ''Baseline'', true
where not exists (select 1 from public.releases);
