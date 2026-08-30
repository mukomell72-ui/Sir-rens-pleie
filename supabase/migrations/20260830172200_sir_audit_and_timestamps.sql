create or replace function private.touch_updated_at() returns trigger
language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','customers','orders','app_settings','price_rules','chemicals','procedures','order_technology_cards'] loop
    execute format('drop trigger if exists sir_touch_updated_at on public.%I',t);
    execute format('create trigger sir_touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()',t);
  end loop;
end $$;

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
  return new;
end $$;

drop trigger if exists sir_audit_order_change on public.orders;
create trigger sir_audit_order_change after update on public.orders for each row execute function private.audit_order_change();
