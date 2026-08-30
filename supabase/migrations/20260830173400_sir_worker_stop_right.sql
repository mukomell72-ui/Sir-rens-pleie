create or replace function private.guard_worker_order_update() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  v_role text;
  v_uid uuid := auth.uid();
  v_allowed text[] := array['status','internal_note','actual_minutes','completed_at','risk_level','updated_at'];
begin
  if v_uid is null then return new; end if;
  select role into v_role from public.profiles where id=v_uid and active=true;
  if v_role is null then raise exception 'inactive staff'; end if;
  if v_role in ('owner','admin','manager') then return new; end if;
  if v_role<>'worker' or old.assigned_to is distinct from v_uid then raise exception 'not allowed'; end if;

  if (to_jsonb(new)-v_allowed) is distinct from (to_jsonb(old)-v_allowed) then
    raise exception 'worker may only update work progress fields';
  end if;

  if new.risk_level is distinct from old.risk_level and new.risk_level<>'stop' then
    raise exception 'worker may only raise risk to STOP';
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

create or replace function private.audit_order_change() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if old.status is distinct from new.status then
    insert into public.order_events(order_id,event_type,from_value,to_value,actor_id)
    values(new.id,'status_changed',old.status,new.status,auth.uid());
    insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'order_status_changed','order',new.id::text,jsonb_build_object('from',old.status,'to',new.status));
  end if;
  if old.final_price is distinct from new.final_price then
    insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'order_final_price_changed','order',new.id::text,jsonb_build_object('from',old.final_price,'to',new.final_price));
  end if;
  if old.assigned_to is distinct from new.assigned_to then
    insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'order_assignment_changed','order',new.id::text,jsonb_build_object('from',old.assigned_to,'to',new.assigned_to));
  end if;
  if old.risk_level is distinct from new.risk_level then
    insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'order_risk_changed','order',new.id::text,jsonb_build_object('from',old.risk_level,'to',new.risk_level));
  end if;
  if old.payment_status is distinct from new.payment_status then
    insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'order_payment_status_changed','order',new.id::text,jsonb_build_object('from',old.payment_status,'to',new.payment_status));
  end if;
  return new;
end $$;
revoke all on function private.audit_order_change() from public;
