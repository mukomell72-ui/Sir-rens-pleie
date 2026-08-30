alter table public.orders add column if not exists status_token_hash text;
alter table public.orders add column if not exists status_token_expires_at timestamptz;

create or replace function public.public_submit_order_v2(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_result jsonb;
  v_order_no text;
  v_version text;
  v_status_token text;
begin
  if coalesce((p_payload->>'privacy_accepted')::boolean,false) is not true then
    raise exception 'privacy consent required';
  end if;
  v_version:=left(coalesce(nullif(trim(p_payload->>'privacy_version'),''),'2026-08-30'),40);
  v_result:=public.public_submit_order(p_payload);
  v_order_no:=v_result->>'order_no';
  v_status_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  update public.orders
     set privacy_accepted_at=now(),
         privacy_version=v_version,
         status_token_hash=encode(extensions.digest(v_status_token,'sha256'),'hex'),
         status_token_expires_at=now()+interval '90 days'
   where order_no=v_order_no;
  return v_result||jsonb_build_object(
    'privacy_accepted',true,
    'privacy_version',v_version,
    'status_token',v_status_token,
    'status_expires_at',now()+interval '90 days'
  );
end $$;
revoke all on function public.public_submit_order_v2(jsonb) from public,anon,authenticated;
grant execute on function public.public_submit_order_v2(jsonb) to anon;

create or replace function public.public_get_order_status(p_order_no text,p_token text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  o public.orders;
  a public.appointments;
begin
  select * into o from public.orders
   where order_no=p_order_no
     and status_token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
     and status_token_expires_at>now();
  if o.id is null then raise exception 'invalid or expired status link'; end if;
  select * into a from public.appointments where order_id=o.id order by starts_at desc limit 1;
  return jsonb_build_object(
    'order_no',o.order_no,
    'status',o.status,
    'service_type',o.service_type,
    'created_at',o.created_at,
    'preliminary_price',o.preliminary_price,
    'final_price',o.final_price,
    'estimated_minutes',o.estimated_minutes,
    'appointment_start',a.starts_at,
    'appointment_end',a.ends_at,
    'appointment_tentative',a.tentative,
    'offer_sent_at',o.offer_sent_at,
    'payment_status',o.payment_status
  );
end $$;
revoke all on function public.public_get_order_status(text,text) from public,anon,authenticated;
grant execute on function public.public_get_order_status(text,text) to anon;
