-- First-user admin safeguard
-- Run this in Supabase SQL Editor to update your signup trigger so the first user becomes admin automatically.
-- NOTE: This checks if profiles is empty at the time of signup.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  initial_role text;
begin
  select case when not exists (select 1 from public.profiles) then 'admin' else null end into initial_role;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    initial_role
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;
