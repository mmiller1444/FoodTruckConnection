-- Adds conflict checking (prevent double-booking) for accepted requests per truck.
-- Also adds helper indexes.

create extension if not exists btree_gist;

-- Add generated time range for overlap checks (tstzrange is great for this)
alter table public.truck_requests
  add column if not exists time_range tstzrange
  generated always as (tstzrange(start_time, end_time, '[)')) stored;

-- Prevent overlaps for the same accepted truck (only when status='accepted')
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'no_overlap_accepted_per_truck'
  ) then
    alter table public.truck_requests
      add constraint no_overlap_accepted_per_truck
      exclude using gist (
        accepted_truck_id with =,
        time_range with &&
      )
      where (status = 'accepted' and accepted_truck_id is not null);
  end if;
end $$;

-- Helpful indexes
create index if not exists idx_truck_requests_accepted_truck_id on public.truck_requests(accepted_truck_id);
create index if not exists idx_truck_requests_start_time on public.truck_requests(start_time);

-- Strengthen accept function to raise a friendly error before constraint fires
create or replace function public.accept_truck_request(p_request_id uuid, p_truck_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_start timestamptz;
  v_end   timestamptz;
  v_blanket boolean;
  v_requested uuid;
begin
  select start_time, end_time, blanket_request, requested_truck_id
    into v_start, v_end, v_blanket, v_requested
  from public.truck_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found';
  end if;

  if not (v_blanket = true or v_requested = p_truck_id) then
    raise exception 'This request is not available for your truck';
  end if;

  -- conflict check
  if exists (
    select 1
    from public.truck_requests r
    where r.status = 'accepted'
      and r.accepted_truck_id = p_truck_id
      and tstzrange(r.start_time, r.end_time, '[)') && tstzrange(v_start, v_end, '[)')
  ) then
    raise exception 'Conflict: your truck is already booked during that time';
  end if;

  update public.truck_requests
  set status = 'accepted', accepted_truck_id = p_truck_id
  where id = p_request_id and status = 'pending';
end;
$$;
