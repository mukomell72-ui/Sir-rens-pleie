create or replace function public.public_submit_order_v2(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_result jsonb;
  v_order_no text;
  v_version text;
  v_status_token text;
  v_phone_digits text;
  v_recent integer;
  v_daily integer;
begin
  if coalesce((p_payload->>'privacy_accepted')::boolean,false) is not true then
    raise exception 'privacy consent required';
  end if;

  -- Lightweight abuse protection for the free public endpoint. A legitimate
  -- customer who hits this limit can still contact SIR by phone/SMS.
  v_phone_digits:=regexp_replace(coalesce(p_payload->>'phone',''),'[^0-9]','','g');
  if length(v_phone_digits)<6 then raise exception 'invalid phone'; end if;

  select count(*) into v_recent
    from public.orders
   where created_at>now()-interval '30 minutes'
     and regexp_replace(coalesce(phone,''),'[^0-9]','','g')=v_phone_digits;
  if v_recent>=3 then raise exception 'too many recent requests'; end if;

  select count(*) into v_daily
    from public.orders
   where created_at>now()-interval '24 hours'
     and regexp_replace(coalesce(phone,''),'[^0-9]','','g')=v_phone_digits;
  if v_daily>=8 then raise exception 'daily request limit reached'; end if;

  if length(coalesce(p_payload->>'customer_name',''))>120
     or length(coalesce(p_payload->>'address',''))>300
     or length(coalesce(p_payload->>'comment',''))>2000 then
    raise exception 'request too large';
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

revoke all on function public.public_submit_order_v2(jsonb) from public,authenticated;
grant execute on function public.public_submit_order_v2(jsonb) to anon;
