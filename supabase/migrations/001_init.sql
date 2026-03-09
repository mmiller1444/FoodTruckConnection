create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  contact_name text,
  contact_email text,
  active boolean not null default true
);

create table if not exists public.trucks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  display_name text not null,
  owner_name text,
  owner_email text,
  cuisine_type text,
  phone text,
  active boolean not null default true
);

create table if not exists public.profiles (
  id uuid primary key,
  created_at timestamptz not null default now(),
  email text not null unique,
  display_name text,
  role text not null check (role in ('admin','business_owner','truck_owner')),
  business_id uuid references public.businesses(id) on delete set null,
  truck_id uuid references public.trucks(id) on delete set null
);

create table if not exists public.truck_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  requested_truck_id uuid references public.trucks(id) on delete set null,
  accepted_truck_id uuid references public.trucks(id) on delete set null,
  blanket_request boolean not null default true,
  service_date date not null,
  start_time time not null,
  end_time time not null,
  event_name text not null,
  event_address text not null,
  notes text,
  status text not null default 'open' check (status in ('open','accepted','closed','cancelled','expired')),
  accepted_at timestamptz,
  conflict_checked_at timestamptz,
  constraint request_date_limit check (service_date <= current_date + interval '92 days'),
  constraint request_time_window check (end_time > start_time)
);

create table if not exists public.truck_notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  truck_id uuid not null references public.trucks(id) on delete cascade,
  request_id uuid references public.truck_requests(id) on delete cascade,
  message text not null,
  delivery_channel text not null default 'in_app' check (delivery_channel in ('in_app','email','both')),
  email_sent_at timestamptz,
  is_read boolean not null default false
);

create table if not exists public.truck_locations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  truck_id uuid not null references public.trucks(id) on delete cascade,
  request_id uuid unique references public.truck_requests(id) on delete cascade,
  service_date date not null,
  start_time time not null,
  end_time time not null,
  address text not null,
  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  is_public boolean not null default true,
  constraint location_time_window check (end_time > start_time)
);

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  flag_key text not null unique,
  description text,
  is_enabled boolean not null default false
);

create table if not exists public.change_control_versions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  version_label text not null unique,
  notes text,
  is_active boolean not null default false,
  snapshot jsonb not null default '{}'::jsonb,
  activated_at timestamptz,
  rollback_reason text
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid,
  action_type text not null,
  target_table text not null,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  source text not null default 'app'
);

create index if not exists idx_truck_requests_business on public.truck_requests(business_id, service_date);
create index if not exists idx_truck_requests_requested_truck on public.truck_requests(requested_truck_id, service_date);
create index if not exists idx_truck_requests_accepted_truck on public.truck_requests(accepted_truck_id, service_date);
create index if not exists idx_truck_locations_truck_date on public.truck_locations(truck_id, service_date, start_time, end_time);
create index if not exists idx_notifications_truck_created on public.truck_notifications(truck_id, created_at desc);
create index if not exists idx_admin_audit_created on public.admin_audit_log(created_at desc);

insert into public.feature_flags (flag_key, description, is_enabled)
values
('public_map_enabled', 'Expose the public daily map', true),
('blanket_requests_enabled', 'Allow blanket truck requests', true),
('change_control_enabled', 'Allow admin release activation', true),
('email_notifications_enabled', 'Allow SMTP email notifications from Vercel', true)
on conflict (flag_key) do nothing;

insert into public.change_control_versions (version_label, notes, is_active, activated_at, snapshot)
values (
  'v1.1.0',
  'Scaffold with notifications, conflict checks, and audit trail',
  true,
  now(),
  jsonb_build_object(
    'feature_flags', (
      select jsonb_agg(jsonb_build_object('flag_key', flag_key, 'is_enabled', is_enabled)) from public.feature_flags
    )
  )
)
on conflict (version_label) do nothing;

create or replace view public.public_truck_locations as
select
  tl.id,
  tl.service_date,
  tl.start_time,
  tl.end_time,
  tl.address,
  tl.latitude,
  tl.longitude,
  t.display_name as truck_name
from public.truck_locations tl
join public.trucks t on t.id = tl.truck_id
where tl.is_public = true and t.active = true;

create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and role = 'admin'
  );
$$;

create or replace function public.write_admin_audit(
  p_action_type text,
  p_target_table text,
  p_target_id uuid,
  p_details jsonb default '{}'::jsonb,
  p_source text default 'db'
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.admin_audit_log (actor_user_id, action_type, target_table, target_id, details, source)
  values (auth.uid(), p_action_type, p_target_table, p_target_id, coalesce(p_details, '{}'::jsonb), p_source);
end;
$$;

create or replace function public.truck_has_schedule_conflict(
  p_truck_id uuid,
  p_service_date date,
  p_start_time time,
  p_end_time time,
  p_exclude_request_id uuid default null
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.truck_locations tl
    where tl.truck_id = p_truck_id
      and tl.service_date = p_service_date
      and (p_exclude_request_id is null or tl.request_id <> p_exclude_request_id)
      and (p_start_time, p_end_time) overlaps (tl.start_time, tl.end_time)
  )
  or exists (
    select 1
    from public.truck_requests tr
    where tr.accepted_truck_id = p_truck_id
      and tr.status = 'accepted'
      and tr.service_date = p_service_date
      and (p_exclude_request_id is null or tr.id <> p_exclude_request_id)
      and (p_start_time, p_end_time) overlaps (tr.start_time, tr.end_time)
  );
$$;

create or replace function public.accept_truck_request(p_request_id uuid, p_truck_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_request public.truck_requests%rowtype;
  v_conflict boolean;
begin
  select * into v_request
  from public.truck_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found';
  end if;

  if v_request.status <> 'open' then
    raise exception 'Request is no longer open';
  end if;

  if not (v_request.blanket_request = true or v_request.requested_truck_id = p_truck_id) then
    raise exception 'Truck is not eligible for this request';
  end if;

  v_conflict := public.truck_has_schedule_conflict(
    p_truck_id,
    v_request.service_date,
    v_request.start_time,
    v_request.end_time,
    v_request.id
  );

  update public.truck_requests
  set conflict_checked_at = now()
  where id = p_request_id;

  if v_conflict then
    raise exception 'Truck already has a conflicting booking for this date and time';
  end if;

  update public.truck_requests
  set accepted_truck_id = p_truck_id,
      status = 'accepted',
      accepted_at = now(),
      conflict_checked_at = now()
  where id = p_request_id;

  insert into public.truck_locations (
    truck_id,
    request_id,
    service_date,
    start_time,
    end_time,
    address,
    latitude,
    longitude,
    is_public
  )
  values (
    p_truck_id,
    v_request.id,
    v_request.service_date,
    v_request.start_time,
    v_request.end_time,
    v_request.event_address,
    45.7833,
    -108.5007,
    true
  )
  on conflict (request_id) do update
  set truck_id = excluded.truck_id,
      service_date = excluded.service_date,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      address = excluded.address,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      is_public = excluded.is_public;

  perform public.write_admin_audit(
    'request_accepted',
    'truck_requests',
    v_request.id,
    jsonb_build_object('accepted_truck_id', p_truck_id, 'service_date', v_request.service_date, 'start_time', v_request.start_time, 'end_time', v_request.end_time),
    'db'
  );
end;
$$;

create or replace function public.get_open_requests_for_truck(p_truck_id uuid)
returns table (
  id uuid,
  event_name text,
  event_address text,
  service_date date,
  start_time time,
  end_time time,
  notes text,
  has_conflict boolean
)
language sql
security definer
as $$
  select
    tr.id,
    tr.event_name,
    tr.event_address,
    tr.service_date,
    tr.start_time,
    tr.end_time,
    tr.notes,
    public.truck_has_schedule_conflict(p_truck_id, tr.service_date, tr.start_time, tr.end_time, tr.id) as has_conflict
  from public.truck_requests tr
  where tr.status = 'open'
    and (tr.blanket_request = true or tr.requested_truck_id = p_truck_id)
  order by tr.service_date, tr.start_time;
$$;

create or replace function public.activate_change_control_version(p_version_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
as $$
declare
  v_snapshot jsonb;
  item jsonb;
begin
  select snapshot into v_snapshot
  from public.change_control_versions
  where id = p_version_id;

  if v_snapshot is null then
    raise exception 'Change control version not found';
  end if;

  update public.change_control_versions set is_active = false;
  update public.change_control_versions
  set is_active = true,
      activated_at = now(),
      rollback_reason = p_reason
  where id = p_version_id;

  for item in select * from jsonb_array_elements(coalesce(v_snapshot->'feature_flags', '[]'::jsonb))
  loop
    update public.feature_flags
    set is_enabled = coalesce((item->>'is_enabled')::boolean, false)
    where flag_key = item->>'flag_key';
  end loop;

  perform public.write_admin_audit(
    'release_activated',
    'change_control_versions',
    p_version_id,
    jsonb_build_object('reason', p_reason),
    'db'
  );
end;
$$;

create or replace function public.notify_truck_owners_after_request()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.blanket_request = true then
    insert into public.truck_notifications (truck_id, request_id, message, delivery_channel)
    select id, new.id, 'New blanket request for ' || new.event_name || ' on ' || new.service_date, 'both'
    from public.trucks
    where active = true;
  elsif new.requested_truck_id is not null then
    insert into public.truck_notifications (truck_id, request_id, message, delivery_channel)
    values (new.requested_truck_id, new.id, 'New direct request for ' || new.event_name || ' on ' || new.service_date, 'both');
  end if;

  perform public.write_admin_audit(
    'request_created',
    'truck_requests',
    new.id,
    jsonb_build_object('business_id', new.business_id, 'requested_truck_id', new.requested_truck_id, 'blanket_request', new.blanket_request),
    'db'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_truck_owners_after_request on public.truck_requests;
create trigger trg_notify_truck_owners_after_request
after insert on public.truck_requests
for each row execute function public.notify_truck_owners_after_request();

alter table public.businesses enable row level security;
alter table public.trucks enable row level security;
alter table public.profiles enable row level security;
alter table public.truck_requests enable row level security;
alter table public.truck_notifications enable row level security;
alter table public.truck_locations enable row level security;
alter table public.feature_flags enable row level security;
alter table public.change_control_versions enable row level security;
alter table public.admin_audit_log enable row level security;

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles for select using (auth.uid() = id or public.is_admin(auth.uid()));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists businesses_select on public.businesses;
create policy businesses_select on public.businesses for select using (public.is_admin(auth.uid()) or id in (select business_id from public.profiles where id = auth.uid()));

drop policy if exists trucks_select on public.trucks;
create policy trucks_select on public.trucks for select using (true);

drop policy if exists requests_select on public.truck_requests;
create policy requests_select on public.truck_requests for select using (
  public.is_admin(auth.uid())
  or business_id in (select business_id from public.profiles where id = auth.uid())
  or accepted_truck_id in (select truck_id from public.profiles where id = auth.uid())
  or requested_truck_id in (select truck_id from public.profiles where id = auth.uid())
  or blanket_request = true
);

drop policy if exists requests_insert_business on public.truck_requests;
create policy requests_insert_business on public.truck_requests for insert with check (
  public.is_admin(auth.uid())
  or business_id in (select business_id from public.profiles where id = auth.uid())
);

drop policy if exists requests_update_admin_or_assigned on public.truck_requests;
create policy requests_update_admin_or_assigned on public.truck_requests for update using (
  public.is_admin(auth.uid())
  or requested_truck_id in (select truck_id from public.profiles where id = auth.uid())
  or accepted_truck_id in (select truck_id from public.profiles where id = auth.uid())
);

drop policy if exists truck_notifications_select on public.truck_notifications;
create policy truck_notifications_select on public.truck_notifications for select using (
  public.is_admin(auth.uid())
  or truck_id in (select truck_id from public.profiles where id = auth.uid())
);

drop policy if exists truck_locations_public_read on public.truck_locations;
create policy truck_locations_public_read on public.truck_locations for select using (is_public = true or public.is_admin(auth.uid()));

drop policy if exists feature_flags_admin on public.feature_flags;
create policy feature_flags_admin on public.feature_flags for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists change_control_admin on public.change_control_versions;
create policy change_control_admin on public.change_control_versions for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists audit_admin_only on public.admin_audit_log;
create policy audit_admin_only on public.admin_audit_log for select using (public.is_admin(auth.uid()));
