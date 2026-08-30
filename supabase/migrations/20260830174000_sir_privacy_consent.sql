alter table public.orders add column if not exists privacy_accepted_at timestamptz;
alter table public.orders add column if not exists privacy_version text;

create or replace function public.public_submit_order_v2(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_result jsonb;
  v_order_no text;
  v_version text;
begin
  if coalesce((p_payload->>'privacy_accepted')::boolean,false) is not true then
    raise exception 'privacy consent required';
  end if;
  v_version:=left(coalesce(nullif(trim(p_payload->>'privacy_version'),''),'2026-08-30'),40);
  v_result:=public.public_submit_order(p_payload);
  v_order_no:=v_result->>'order_no';
  update public.orders
     set privacy_accepted_at=now(),privacy_version=v_version
   where order_no=v_order_no;
  return v_result||jsonb_build_object('privacy_accepted',true,'privacy_version',v_version);
end $$;
revoke all on function public.public_submit_order_v2(jsonb) from public,anon,authenticated;
grant execute on function public.public_submit_order_v2(jsonb) to anon;

-- The old endpoint remains callable internally by v2 but is no longer exposed anonymously.
revoke execute on function public.public_submit_order(jsonb) from anon,authenticated;
