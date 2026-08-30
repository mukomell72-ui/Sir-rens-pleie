alter table public.orders add column if not exists public_token_hash text;
alter table public.orders add column if not exists public_token_expires_at timestamptz;

create table if not exists public.order_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check(size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now()
);
alter table public.order_photos enable row level security;
drop policy if exists order_photos_staff on public.order_photos;
create policy order_photos_staff on public.order_photos for all to authenticated
  using(private.is_staff()) with check(private.is_staff());
grant select,insert,update,delete on public.order_photos to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('order-photos','order-photos',false,10485760,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists sir_order_photos_staff_read on storage.objects;
create policy sir_order_photos_staff_read on storage.objects for select to authenticated
  using(bucket_id='order-photos' and private.is_staff());
drop policy if exists sir_order_photos_staff_delete on storage.objects;
create policy sir_order_photos_staff_delete on storage.objects for delete to authenticated
  using(bucket_id='order-photos' and private.is_staff(array['owner','admin','manager']));

create or replace function public.public_submit_order(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_name text; v_phone text; v_customer uuid; v_order public.orders; v_price numeric; v_distance numeric; v_token text;
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

  v_token:=encode(gen_random_bytes(24),'hex');

  insert into public.orders(customer_id,customer_name,phone,address,distance_km,service_type,vehicle_plate,vehicle_seats,package_code,contamination,stains,pet_hair,odor,customer_comment,preliminary_price,source,referral_code_used,public_token_hash,public_token_expires_at)
  values(v_customer,v_name,v_phone,nullif(trim(coalesce(p_payload->>'address','')),''),v_distance,left(coalesce(p_payload->>'service','unknown'),40),left(coalesce(p_payload->>'plate',''),20),nullif(p_payload->>'seats','')::integer,left(coalesce(p_payload->>'package',''),30),left(coalesce(p_payload->>'condition',''),20),coalesce((p_payload->>'stains')::boolean,false),coalesce((p_payload->>'hair')::boolean,false),coalesce((p_payload->>'odor')::boolean,false),left(coalesce(p_payload->>'comment',''),2000),v_price,'website',left(coalesce(p_payload->>'referral_code',''),50),encode(digest(v_token,'sha256'),'hex'),now()+interval '24 hours')
  returning * into v_order;

  insert into public.order_events(order_id,event_type,to_value,note) values(v_order.id,'created','new','Website submission');
  return jsonb_build_object('order_no',v_order.order_no,'status',v_order.status,'upload_token',v_token);
end $$;
revoke all on function public.public_submit_order(jsonb) from public;
grant execute on function public.public_submit_order(jsonb) to anon,authenticated;
