-- Security model for SIR core tables.
create or replace function public.current_staff_role() returns text
language sql stable security definer set search_path=public as $$
  select role from public.profiles where id=auth.uid() and active=true
$$;

create or replace function public.is_staff(allowed text[] default array['owner','admin','manager','worker']) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and active=true and role=any(allowed))
$$;

create or replace function public.create_profile_for_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,display_name,role)
  values(new.id,coalesce(new.raw_user_meta_data->>'display_name',new.email),'worker')
  on conflict(id) do nothing;
  return new;
end $$;

drop trigger if exists sir_on_auth_user_created on auth.users;
create trigger sir_on_auth_user_created after insert on auth.users for each row execute function public.create_profile_for_user();

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.appointments enable row level security;
alter table public.order_events enable row level security;
alter table public.audit_events enable row level security;
alter table public.app_settings enable row level security;
alter table public.price_rules enable row level security;
alter table public.referrals enable row level security;
alter table public.chemicals enable row level security;
alter table public.procedures enable row level security;
alter table public.order_technology_cards enable row level security;

create policy profiles_select on public.profiles for select using(id=auth.uid() or public.is_staff(array['owner','admin']));
create policy profiles_manage on public.profiles for update using(public.is_staff(array['owner','admin'])) with check(public.is_staff(array['owner','admin']));
create policy customers_staff on public.customers for all using(public.is_staff()) with check(public.is_staff());
create policy orders_read on public.orders for select using(public.is_staff());
create policy orders_create on public.orders for insert with check(public.is_staff(array['owner','admin','manager']));
create policy orders_edit on public.orders for update using(public.is_staff()) with check(public.is_staff());
create policy appointments_staff on public.appointments for all using(public.is_staff()) with check(public.is_staff());
create policy order_events_staff on public.order_events for all using(public.is_staff()) with check(public.is_staff());
create policy audit_read on public.audit_events for select using(public.is_staff(array['owner','admin']));
create policy audit_write on public.audit_events for insert with check(public.is_staff());
create policy settings_read on public.app_settings for select using(public.is_staff());
create policy settings_manage on public.app_settings for all using(public.is_staff(array['owner','admin'])) with check(public.is_staff(array['owner','admin']));
create policy prices_read on public.price_rules for select using(public.is_staff());
create policy prices_manage on public.price_rules for all using(public.is_staff(array['owner','admin'])) with check(public.is_staff(array['owner','admin']));
create policy referrals_staff on public.referrals for all using(public.is_staff()) with check(public.is_staff());
create policy chemicals_read on public.chemicals for select using(public.is_staff());
create policy chemicals_manage on public.chemicals for all using(public.is_staff(array['owner','admin'])) with check(public.is_staff(array['owner','admin']));
create policy procedures_read on public.procedures for select using(public.is_staff());
create policy procedures_manage on public.procedures for all using(public.is_staff(array['owner','admin'])) with check(public.is_staff(array['owner','admin']));
create policy tech_cards_staff on public.order_technology_cards for all using(public.is_staff()) with check(public.is_staff());

create or replace function public.public_submit_order(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_name text; v_phone text; v_customer uuid; v_order public.orders; v_price numeric; v_distance numeric;
begin
  v_name:=trim(coalesce(p_payload->>'customer_name',''));
  v_phone:=trim(coalesce(p_payload->>'phone',''));
  if length(v_name)<2 or length(v_name)>120 then raise exception 'invalid name'; end if;
  if length(v_phone)<6 or length(v_phone)>30 then raise exception 'invalid phone'; end if;
  v_price:=nullif(p_payload->>'preliminary_price','')::numeric;
  v_distance:=nullif(p_payload->>'distance_km','')::numeric;
  if v_price is not null and (v_price<0 or v_price>100000) then raise exception 'invalid price'; end if;
  if v_distance is not null and (v_distance<0 or v_distance>500) then raise exception 'invalid distance'; end if;

  insert into public.customers(name,phone,address,referral_code)
  values(v_name,v_phone,nullif(trim(coalesce(p_payload->>'address','')),''),'SIR-'||upper(substr(encode(gen_random_bytes(5),'hex'),1,8)))
  on conflict(phone) do update set name=excluded.name,address=coalesce(excluded.address,public.customers.address),updated_at=now()
  returning id into v_customer;

  insert into public.orders(customer_id,customer_name,phone,address,distance_km,service_type,vehicle_plate,vehicle_seats,package_code,contamination,stains,pet_hair,odor,customer_comment,preliminary_price,source,referral_code_used)
  values(v_customer,v_name,v_phone,nullif(trim(coalesce(p_payload->>'address','')),''),v_distance,left(coalesce(p_payload->>'service','unknown'),40),
  left(coalesce(p_payload->>'plate',''),20),nullif(p_payload->>'seats','')::integer,left(coalesce(p_payload->>'package',''),30),
  left(coalesce(p_payload->>'condition',''),20),coalesce((p_payload->>'stains')::boolean,false),coalesce((p_payload->>'hair')::boolean,false),
  coalesce((p_payload->>'odor')::boolean,false),left(coalesce(p_payload->>'comment',''),2000),v_price,'website',left(coalesce(p_payload->>'referral_code',''),50))
  returning * into v_order;

  insert into public.order_events(order_id,event_type,to_value,note) values(v_order.id,'created','new','Website submission');
  return jsonb_build_object('order_no',v_order.order_no,'status',v_order.status);
end $$;

revoke all on function public.public_submit_order(jsonb) from public;
grant execute on function public.public_submit_order(jsonb) to anon,authenticated;
