drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or private.is_staff(array['owner','admin','manager'])
);

create or replace function private.normalize_order_lifecycle()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status='completed' and old.status is distinct from 'completed' and new.completed_at is null then
    new.completed_at:=now();
  elsif old.status='completed' and new.status is distinct from 'completed' then
    new.completed_at:=null;
  end if;
  return new;
end $$;

drop trigger if exists sir_normalize_order_lifecycle on public.orders;
create trigger sir_normalize_order_lifecycle
before update on public.orders
for each row execute function private.normalize_order_lifecycle();
