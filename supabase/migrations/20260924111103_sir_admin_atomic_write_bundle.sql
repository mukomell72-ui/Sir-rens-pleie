-- Make multi-row admin writes transactional so partial state cannot survive a failed request.

create or replace function public.create_manual_order(
  p_name text,
  p_phone text,
  p_service text,
  p_preliminary_price numeric default null,
  p_comment text default null
)
returns jsonb
language plpgsql
security invoker
set search_path='public'
as $$
declare
  v_uid uuid := auth.uid();
  v_customer_id uuid;
  v_order public.orders;
  v_name text := trim(coalesce(p_name,''));
  v_phone text := trim(coalesce(p_phone,''));
  v_service text := trim(coalesce(p_service,''));
  v_referral text := 'SIR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
begin
  if v_uid is null or not private.is_staff(array['owner','admin','manager']) then
    raise exception 'owner/admin/manager access required';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 120 then raise exception 'invalid customer name'; end if;
  if char_length(v_phone) < 6 or char_length(v_phone) > 30 then raise exception 'invalid customer phone'; end if;
  if v_service not in ('car','sofa','chair','mattress','rug') then raise exception 'invalid service'; end if;
  if p_preliminary_price is not null and (p_preliminary_price < 0 or p_preliminary_price > 100000) then
    raise exception 'invalid preliminary price';
  end if;
  if char_length(coalesce(p_comment,'')) > 2000 then raise exception 'comment too long'; end if;

  insert into public.customers(name,phone,referral_code)
  values(v_name,v_phone,v_referral)
  on conflict (phone) do update
    set name=excluded.name, updated_at=now()
  returning id into v_customer_id;

  insert into public.orders(
    customer_id,customer_name,phone,service_type,preliminary_price,customer_comment,status,source
  )
  values(
    v_customer_id,v_name,v_phone,v_service,p_preliminary_price,nullif(trim(coalesce(p_comment,'')),''),
    'under_review','manual'
  )
  returning * into v_order;

  return jsonb_build_object('id',v_order.id,'order_no',v_order.order_no,'customer_id',v_customer_id);
end
$$;

revoke all on function public.create_manual_order(text,text,text,numeric,text) from public, anon;
grant execute on function public.create_manual_order(text,text,text,numeric,text) to authenticated;

create or replace function public.save_calendar_booking(
  p_order_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_tentative boolean,
  p_location_mode text,
  p_address text,
  p_buffer_minutes integer
)
returns jsonb
language plpgsql
security invoker
set search_path='public'
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders;
  v_appointment public.appointments;
  v_mode text := trim(coalesce(p_location_mode,'mobile'));
  v_buffer integer := greatest(0,least(coalesce(p_buffer_minutes,30),240));
begin
  if v_uid is null or not private.is_staff(array['owner','admin','manager']) then
    raise exception 'owner/admin/manager access required';
  end if;
  if p_order_id is null or p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'invalid appointment interval';
  end if;
  if p_ends_at - p_starts_at > interval '24 hours' then raise exception 'appointment too long'; end if;
  if v_mode not in ('mobile','shop','other') then raise exception 'invalid location mode'; end if;

  select * into v_order from public.orders where id=p_order_id for update;
  if v_order.id is null then raise exception 'order not found'; end if;
  if v_order.status in ('completed','cancelled_customer','cancelled_sir','no_show') then
    raise exception 'inactive order cannot be scheduled';
  end if;

  insert into public.appointments(
    order_id,starts_at,ends_at,tentative,location_mode,address,buffer_minutes,created_by
  )
  values(
    p_order_id,p_starts_at,p_ends_at,coalesce(p_tentative,true),v_mode,
    nullif(trim(coalesce(p_address,'')),''),v_buffer,v_uid
  )
  returning * into v_appointment;

  if v_order.status='new' then
    update public.orders set status='under_review' where id=p_order_id;
  end if;

  return jsonb_build_object(
    'id',v_appointment.id,
    'order_id',p_order_id,
    'status',case when v_order.status='new' then 'under_review' else v_order.status end
  );
end
$$;

revoke all on function public.save_calendar_booking(uuid,timestamptz,timestamptz,boolean,text,text,integer) from public, anon;
grant execute on function public.save_calendar_booking(uuid,timestamptz,timestamptz,boolean,text,text,integer) to authenticated;

create or replace function public.save_admin_settings_bundle(
  p_settings jsonb,
  p_prices jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path='public'
as $$
declare
  v_uid uuid := auth.uid();
  v_key text;
  v_value jsonb;
  v_item jsonb;
  v_id uuid;
  v_light numeric;
  v_medium numeric;
  v_heavy numeric;
  v_rows integer;
  v_settings_count integer := 0;
  v_price_count integer := 0;
begin
  if v_uid is null or not private.is_staff(array['owner','admin']) then
    raise exception 'owner/admin access required';
  end if;
  if p_settings is null or jsonb_typeof(p_settings)<>'object' then raise exception 'settings payload must be an object'; end if;
  if p_prices is null then p_prices:='[]'::jsonb; end if;
  if jsonb_typeof(p_prices)<>'array' then raise exception 'prices payload must be an array'; end if;

  for v_key in select jsonb_object_keys(p_settings)
  loop
    if v_key not in ('company','travel','referral','work_rules') then raise exception 'unsupported settings key: %',v_key; end if;
    v_value:=p_settings->v_key;
    if jsonb_typeof(v_value)<>'object' then raise exception 'settings value must be an object'; end if;
    insert into public.app_settings(key,value,updated_by)
    values(v_key,v_value,v_uid)
    on conflict (key) do update
      set value=excluded.value, updated_by=v_uid, updated_at=now();
    v_settings_count:=v_settings_count+1;
  end loop;

  for v_item in select value from jsonb_array_elements(p_prices)
  loop
    begin
      v_id:=(v_item->>'id')::uuid;
      v_light:=case when v_item->'light_price' is null or jsonb_typeof(v_item->'light_price')='null' then null else (v_item->>'light_price')::numeric end;
      v_medium:=case when v_item->'medium_price' is null or jsonb_typeof(v_item->'medium_price')='null' then null else (v_item->>'medium_price')::numeric end;
      v_heavy:=case when v_item->'heavy_price' is null or jsonb_typeof(v_item->'heavy_price')='null' then null else (v_item->>'heavy_price')::numeric end;
    exception when others then
      raise exception 'invalid price payload';
    end;
    if v_id is null then raise exception 'price id is required'; end if;
    if coalesce(v_light,0)<0 or coalesce(v_medium,0)<0 or coalesce(v_heavy,0)<0 then raise exception 'price cannot be negative'; end if;
    update public.price_rules
       set light_price=v_light,medium_price=v_medium,heavy_price=v_heavy,updated_by=v_uid,updated_at=now()
     where id=v_id;
    get diagnostics v_rows = row_count;
    if v_rows<>1 then raise exception 'price rule not found'; end if;
    v_price_count:=v_price_count+1;
  end loop;

  return jsonb_build_object('settings_saved',v_settings_count,'prices_saved',v_price_count);
end
$$;

revoke all on function public.save_admin_settings_bundle(jsonb,jsonb) from public, anon;
grant execute on function public.save_admin_settings_bundle(jsonb,jsonb) to authenticated;

