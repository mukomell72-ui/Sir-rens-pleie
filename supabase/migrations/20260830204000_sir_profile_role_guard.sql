create or replace function private.guard_profile_update() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid:=auth.uid();
  v_actor_role text;
  v_other_active_owners integer;
begin
  -- Database/service maintenance is allowed outside an end-user session.
  if v_uid is null then return new; end if;

  select role into v_actor_role from public.profiles where id=v_uid and active=true;
  if v_actor_role not in ('owner','admin') then raise exception 'not allowed'; end if;

  if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'immutable profile field';
  end if;

  -- ADMIN may manage only MANAGER/WORKER accounts. OWNER controls privileged roles.
  if v_actor_role='admin' then
    if old.role not in ('manager','worker') or new.role not in ('manager','worker') then
      raise exception 'only owner may manage owner/admin roles';
    end if;
  end if;

  -- Never allow removal/deactivation of the final active OWNER.
  if old.role='owner' and old.active=true
     and (new.role is distinct from 'owner' or new.active is false) then
    select count(*) into v_other_active_owners
      from public.profiles
     where role='owner' and active=true and id<>old.id;
    if v_other_active_owners<1 then raise exception 'cannot remove last active owner'; end if;
  end if;

  return new;
end $$;

revoke all on function private.guard_profile_update() from public,anon,authenticated;

drop trigger if exists sir_guard_profile_update on public.profiles;
create trigger sir_guard_profile_update
before update on public.profiles
for each row execute function private.guard_profile_update();
