create or replace function private.guard_worker_order_update() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  v_role text;
  v_uid uuid := auth.uid();
  v_allowed text[] := array['status','internal_note','actual_minutes','completed_at','updated_at'];
begin
  -- Internal database operations and SECURITY DEFINER workflows have no end-user auth.uid().
  -- Direct public table updates are still blocked by RLS, so trusted internal workflows may proceed.
  if v_uid is null then return new; end if;

  select role into v_role from public.profiles where id=v_uid and active=true;
  if v_role is null then raise exception 'inactive staff'; end if;
  if v_role in ('owner','admin','manager') then return new; end if;
  if v_role<>'worker' or old.assigned_to is distinct from v_uid then raise exception 'not allowed'; end if;

  if (to_jsonb(new)-v_allowed) is distinct from (to_jsonb(old)-v_allowed) then
    raise exception 'worker may only update work progress fields';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status='scheduled' and new.status='in_progress') or
      (old.status='confirmed' and new.status='in_progress') or
      (old.status='in_progress' and new.status='completed')
    ) then raise exception 'invalid worker status transition'; end if;
  end if;
  if new.status='completed' and new.completed_at is null then new.completed_at:=now(); end if;
  return new;
end $$;
revoke all on function private.guard_worker_order_update() from public;
