create or replace function private.estimate_order_minutes(p_order uuid) returns integer
language plpgsql security definer set search_path=public as $$
declare
  o public.orders;
  v_base numeric:=120;
  v_items numeric:=0;
  v_mult numeric:=1;
  x record;
begin
  select * into o from public.orders where id=p_order;
  if not found then return null; end if;

  if o.service_type='car' then
    if o.package_code='full' then
      v_base:=case coalesce(o.vehicle_seats,5) when 9 then 330 when 7 then 285 else 240 end;
    elsif o.package_code='seats' then
      v_base:=case coalesce(o.vehicle_seats,5) when 9 then 240 when 7 then 195 else 150 end;
    elsif o.package_code='elements' then
      v_items:=0;
      for x in select item_code,quantity from public.order_items where order_id=p_order loop
        v_items:=v_items + case x.item_code
          when 'seat' then 21*greatest(x.quantity,1)
          when 'ceiling' then 60
          when 'floor_carpet' then 60
          when 'trunk' then 35
          when 'door_cards' then 40
          when 'dashboard_console' then 27
          when 'interior_plastic' then 40
          when 'textile_mats' then 22
          when 'seat_belt' then 8*greatest(x.quantity,1)
          when 'interior_glass' then 15
          when 'child_seat' then 30
          else 25 end;
      end loop;
      v_base:=greatest(75,v_items);
    end if;
  elsif o.service_type='sofa' then
    v_base:=case coalesce((select nullif(size_key,'') from public.order_items where order_id=p_order limit 1),'') when '5' then 180 when '4' then 150 when '2' then 90 else 120 end;
  elsif o.service_type='chair' then
    v_base:=75;
  elsif o.service_type='mattress' then
    v_base:=120;
  end if;

  v_mult:=case o.contamination when 'light' then 0.82 when 'heavy' then 1.35 when 'special' then 1.5 else 1 end;
  v_base:=v_base*v_mult;
  if o.pet_hair then v_base:=v_base+30; end if;
  if o.odor then v_base:=v_base+30; end if;
  return greatest(45,(round(v_base/15.0)*15)::integer);
end $$;
revoke all on function private.estimate_order_minutes(uuid) from public;

create or replace function private.refresh_order_estimate() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_order uuid;
begin
  v_order:=case when tg_table_name='order_items' then coalesce(new.order_id,old.order_id) else coalesce(new.id,old.id) end;
  update public.orders set estimated_minutes=private.estimate_order_minutes(v_order) where id=v_order;
  return coalesce(new,old);
end $$;
revoke all on function private.refresh_order_estimate() from public;

create or replace function private.set_initial_order_estimate() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.estimated_minutes is null then
    if new.service_type='car' and new.package_code='full' then
      new.estimated_minutes:=case coalesce(new.vehicle_seats,5) when 9 then 330 when 7 then 285 else 240 end;
    elsif new.service_type='car' and new.package_code='seats' then
      new.estimated_minutes:=case coalesce(new.vehicle_seats,5) when 9 then 240 when 7 then 195 else 150 end;
    elsif new.service_type='chair' then new.estimated_minutes:=75;
    else new.estimated_minutes:=120;
    end if;
    new.estimated_minutes:=greatest(45,(round((new.estimated_minutes * case new.contamination when 'light' then .82 when 'heavy' then 1.35 when 'special' then 1.5 else 1 end + case when new.pet_hair then 30 else 0 end + case when new.odor then 30 else 0 end)/15.0)*15)::integer);
  end if;
  return new;
end $$;
revoke all on function private.set_initial_order_estimate() from public;

drop trigger if exists sir_set_initial_order_estimate on public.orders;
create trigger sir_set_initial_order_estimate before insert on public.orders
for each row execute function private.set_initial_order_estimate();

drop trigger if exists sir_refresh_estimate_after_order_item on public.order_items;
create trigger sir_refresh_estimate_after_order_item after insert or update or delete on public.order_items
for each row execute function private.refresh_order_estimate();
