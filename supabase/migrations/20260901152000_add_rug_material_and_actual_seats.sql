alter table public.orders add column if not exists material_code text;

alter table public.orders drop constraint if exists orders_service_type_check;
alter table public.orders add constraint orders_service_type_check
  check (service_type in ('car','sofa','chair','mattress','rug'));

alter table public.orders drop constraint if exists orders_vehicle_seats_check;
alter table public.orders add constraint orders_vehicle_seats_check
  check (vehicle_seats is null or vehicle_seats between 1 and 99);

do $migration$
declare
  definition text;
begin
  select pg_get_functiondef('public.public_submit_order(jsonb)'::regprocedure) into definition;
  definition:=replace(definition,
    'if v_service not in (''car'',''sofa'',''chair'',''mattress'') then',
    'if v_service not in (''car'',''sofa'',''chair'',''mattress'',''rug'') then');
  definition:=replace(definition,
    'if v_seats not in (5,7,9) and v_service=''car'' then',
    'if (v_seats<1 or v_seats>99) and v_service=''car'' then');
  definition:=replace(definition,
    'private.rule_price(''full_interior'',v_seats::text,v_level)',
    'private.rule_price(''full_interior'',(case when v_seats<=5 then 5 when v_seats<=7 then 7 else 9 end)::text,v_level)');
  definition:=replace(definition,
    '  elsif v_service=''mattress'' then
    v_size:=left(coalesce(p_payload->>''size'',''double''),20);
    v_price:=private.rule_price(case when v_size=''single'' then ''mattress_single'' else ''mattress_double'' end,''default'',v_level);
  end if;',
    '  elsif v_service=''mattress'' then
    v_size:=left(coalesce(p_payload->>''size'',''double''),20);
    v_price:=private.rule_price(case when v_size=''single'' then ''mattress_single'' else ''mattress_double'' end,''default'',v_level);
  elsif v_service=''rug'' then
    v_price:=null;
  end if;');
  definition:=replace(definition,
    'distance_km,service_type,vehicle_plate',
    'distance_km,service_type,material_code,vehicle_plate');
  definition:=replace(definition,
    'v_distance,v_service,left(coalesce(p_payload->>''plate'',''''),20)',
    'v_distance,v_service,left(coalesce(p_payload->>''material'',''''),40),left(coalesce(p_payload->>''plate'',''''),20)');
  execute definition;
end
$migration$;

revoke all on function public.public_submit_order(jsonb) from public;
grant execute on function public.public_submit_order(jsonb) to anon;
