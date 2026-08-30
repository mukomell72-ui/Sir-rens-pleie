create or replace function private.rule_price(p_code text,p_size text,p_level text) returns numeric
language sql stable security definer set search_path=public as $$
  select case p_level when 'light' then light_price when 'medium' then medium_price when 'heavy' then heavy_price else null end
  from public.price_rules where service_code=p_code and size_key=p_size and active=true limit 1
$$;
revoke all on function private.rule_price(text,text,text) from public;

create or replace function public.public_submit_order(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_name text; v_phone text; v_customer uuid; v_order public.orders;
  v_level text; v_service text; v_package text; v_size text; v_seats integer;
  v_price numeric:=0; v_travel numeric:=0; v_distance numeric; v_token text;
  v_item jsonb; v_code text; v_item_size text; v_qty integer; v_unit numeric; v_line numeric;
  v_travel_cfg jsonb;
begin
  v_name:=trim(coalesce(p_payload->>'customer_name',''));
  v_phone:=trim(coalesce(p_payload->>'phone',''));
  if length(v_name)<2 or length(v_name)>120 then raise exception 'invalid name'; end if;
  if length(v_phone)<6 or length(v_phone)>30 then raise exception 'invalid phone'; end if;
  v_distance:=nullif(p_payload->>'distance_km','')::numeric;
  if v_distance is not null and (v_distance<0 or v_distance>500) then raise exception 'invalid distance'; end if;
  v_level:=left(coalesce(p_payload->>'condition',''),20);
  if v_level not in ('light','medium','heavy','special') then raise exception 'invalid condition'; end if;
  v_service:=left(coalesce(p_payload->>'service',''),40);
  if v_service not in ('car','sofa','chair','mattress') then raise exception 'invalid service'; end if;
  v_package:=left(coalesce(p_payload->>'package',''),30);
  v_seats:=coalesce(nullif(p_payload->>'seats','')::integer,5);
  if v_seats not in (5,7,9) and v_service='car' then raise exception 'invalid seats'; end if;

  if v_level='special' then
    v_price:=null;
  elsif v_service='car' then
    if v_package='full' then
      v_price:=private.rule_price('full_interior',v_seats::text,v_level);
    elsif v_package='seats' then
      v_price:=0;
      for i in 1..v_seats loop
        if i in (4,7,8) then v_price:=v_price+coalesce(private.rule_price('seat_discounted','default',v_level),0);
        else v_price:=v_price+coalesce(private.rule_price('seat','default',v_level),0); end if;
      end loop;
    elsif v_package='elements' then
      v_price:=0;
      if jsonb_typeof(p_payload->'items')<>'array' or jsonb_array_length(p_payload->'items')=0 then raise exception 'items required'; end if;
      for v_item in select value from jsonb_array_elements(p_payload->'items') loop
        v_code:=left(coalesce(v_item->>'code',''),40);
        v_item_size:=left(coalesce(v_item->>'size_key','default'),20);
        v_qty:=greatest(1,least(50,coalesce(nullif(v_item->>'quantity','')::integer,1)));
        if v_code='seat' then
          v_line:=0;
          for i in 1..v_qty loop
            if i in (4,7,8) then v_line:=v_line+coalesce(private.rule_price('seat_discounted','default',v_level),0);
            else v_line:=v_line+coalesce(private.rule_price('seat','default',v_level),0); end if;
          end loop;
          v_unit:=case when v_qty>0 then v_line/v_qty else 0 end;
        elsif v_code in ('ceiling','floor_carpet','trunk','door_cards','dashboard_console','interior_plastic','textile_mats','seat_belt','interior_glass','child_seat') then
          v_unit:=private.rule_price(v_code,v_item_size,v_level);
          if v_unit is null then raise exception 'invalid item configuration'; end if;
          v_line:=v_unit*v_qty;
        else raise exception 'invalid item'; end if;
        v_price:=v_price+v_line;
      end loop;
    else raise exception 'invalid car package'; end if;
  elsif v_service='sofa' then
    v_size:=left(coalesce(p_payload->>'size','3'),20); v_price:=private.rule_price('sofa',v_size,v_level);
  elsif v_service='chair' then
    v_price:=private.rule_price('armchair','default',v_level);
  elsif v_service='mattress' then
    v_size:=left(coalesce(p_payload->>'size','double'),20);
    v_price:=private.rule_price(case when v_size='single' then 'mattress_single' else 'mattress_double' end,'default',v_level);
  end if;

  if v_price is not null then
    if coalesce((p_payload->>'hair')::boolean,false) then v_price:=v_price+coalesce(private.rule_price('extra_pet_hair','default',v_level),0); end if;
    if coalesce((p_payload->>'odor')::boolean,false) then v_price:=v_price+coalesce(private.rule_price('extra_odor','default',v_level),0); end if;
    select value into v_travel_cfg from public.app_settings where key='travel';
    if v_distance is not null then
      if v_distance<=10 then v_travel:=coalesce((v_travel_cfg->>'0_10')::numeric,0);
      elsif v_distance<=20 then v_travel:=coalesce((v_travel_cfg->>'11_20')::numeric,150);
      elsif v_distance<=30 then v_travel:=coalesce((v_travel_cfg->>'21_30')::numeric,250);
      elsif v_distance<=40 then v_travel:=coalesce((v_travel_cfg->>'31_40')::numeric,350);
      else v_price:=null; end if;
    end if;
    if v_price is not null then v_price:=v_price+v_travel; end if;
  end if;

  insert into public.customers(name,phone,address,referral_code)
  values(v_name,v_phone,nullif(trim(coalesce(p_payload->>'address','')),''),'SIR-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)))
  on conflict(phone) do update set name=excluded.name,address=coalesce(excluded.address,public.customers.address),updated_at=now()
  returning id into v_customer;

  v_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');

  insert into public.orders(customer_id,customer_name,phone,address,distance_km,service_type,vehicle_plate,vehicle_seats,package_code,contamination,stains,pet_hair,odor,customer_comment,preliminary_price,travel_fee,source,referral_code_used,public_token_hash,public_token_expires_at)
  values(v_customer,v_name,v_phone,nullif(trim(coalesce(p_payload->>'address','')),''),v_distance,v_service,left(coalesce(p_payload->>'plate',''),20),case when v_service='car' then v_seats else null end,v_package,v_level,coalesce((p_payload->>'stains')::boolean,false),coalesce((p_payload->>'hair')::boolean,false),coalesce((p_payload->>'odor')::boolean,false),left(coalesce(p_payload->>'comment',''),2000),v_price,v_travel,'website',left(coalesce(p_payload->>'referral_code',''),50),encode(extensions.digest(v_token,'sha256'),'hex'),now()+interval '24 hours')
  returning * into v_order;

  if v_service='car' and v_package='elements' then
    for v_item in select value from jsonb_array_elements(p_payload->'items') loop
      v_code:=left(coalesce(v_item->>'code',''),40); v_item_size:=left(coalesce(v_item->>'size_key','default'),20);
      v_qty:=greatest(1,least(50,coalesce(nullif(v_item->>'quantity','')::integer,1)));
      if v_code='seat' then
        v_line:=0;
        for i in 1..v_qty loop
          if i in (4,7,8) then v_line:=v_line+coalesce(private.rule_price('seat_discounted','default',v_level),0);
          else v_line:=v_line+coalesce(private.rule_price('seat','default',v_level),0); end if;
        end loop;
        v_unit:=case when v_qty>0 then v_line/v_qty else 0 end;
      else v_unit:=private.rule_price(v_code,v_item_size,v_level); v_line:=v_unit*v_qty; end if;
      insert into public.order_items(order_id,item_code,size_key,quantity,contamination,unit_price,line_total)
      values(v_order.id,v_code,v_item_size,v_qty,v_level,v_unit,v_line);
    end loop;
  end if;

  insert into public.order_events(order_id,event_type,to_value,note) values(v_order.id,'created','new','Website submission');
  return jsonb_build_object('order_no',v_order.order_no,'status',v_order.status,'upload_token',v_token,'preliminary_price',v_price,'travel_fee',v_travel);
end $$;
revoke all on function public.public_submit_order(jsonb) from public;
grant execute on function public.public_submit_order(jsonb) to anon;
