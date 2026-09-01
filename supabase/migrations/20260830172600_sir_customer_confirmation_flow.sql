alter table public.orders add column if not exists confirmation_token_hash text;
alter table public.orders add column if not exists confirmation_expires_at timestamptz;
alter table public.orders add column if not exists offer_sent_at timestamptz;

create or replace function public.issue_order_confirmation_token(p_order uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid := auth.uid();
  v_token text;
  v_order public.orders;
  v_appt public.appointments;
begin
  if v_uid is null or not private.is_staff(array['owner','admin','manager']) then raise exception 'not allowed'; end if;
  select * into v_order from public.orders where id=p_order;
  if v_order.id is null then raise exception 'order not found'; end if;
  if v_order.final_price is null then raise exception 'final price required'; end if;
  select * into v_appt from public.appointments where order_id=p_order order by starts_at desc limit 1;
  if v_appt.id is null then raise exception 'appointment required'; end if;

  v_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  update public.orders
     set confirmation_token_hash=encode(extensions.digest(v_token,'sha256'),'hex'),
         confirmation_expires_at=now()+interval '7 days',
         offer_sent_at=now(),
         status='awaiting_confirmation'
   where id=p_order
   returning * into v_order;

  return jsonb_build_object('order_no',v_order.order_no,'token',v_token,'expires_at',v_order.confirmation_expires_at);
end $$;
revoke all on function public.issue_order_confirmation_token(uuid) from public,anon,authenticated;
grant execute on function public.issue_order_confirmation_token(uuid) to authenticated;

create or replace function public.public_get_offer(p_order_no text,p_token text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_order public.orders;
  v_appt public.appointments;
begin
  select * into v_order from public.orders
   where order_no=p_order_no
     and confirmation_token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
     and confirmation_expires_at>now();
  if v_order.id is null then raise exception 'invalid or expired offer'; end if;
  select * into v_appt from public.appointments where order_id=v_order.id order by starts_at desc limit 1;
  return jsonb_build_object(
    'order_no',v_order.order_no,
    'status',v_order.status,
    'service_type',v_order.service_type,
    'final_price',v_order.final_price,
    'estimated_minutes',v_order.estimated_minutes,
    'starts_at',v_appt.starts_at,
    'ends_at',v_appt.ends_at,
    'location_mode',v_appt.location_mode,
    'address',coalesce(v_appt.address,v_order.address)
  );
end $$;
revoke all on function public.public_get_offer(text,text) from public;
grant execute on function public.public_get_offer(text,text) to anon;

create or replace function public.public_respond_offer(p_order_no text,p_token text,p_action text,p_requested text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_order public.orders;
  v_status text;
  v_note text := left(coalesce(p_requested,''),500);
begin
  select * into v_order from public.orders
   where order_no=p_order_no
     and confirmation_token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
     and confirmation_expires_at>now();
  if v_order.id is null then raise exception 'invalid or expired offer'; end if;
  if v_order.status not in ('awaiting_confirmation','offer_sent') then
    return jsonb_build_object('status',v_order.status,'changed',false);
  end if;

  if p_action='confirm' then
    v_status:='confirmed';
    update public.appointments set tentative=false where order_id=v_order.id;
  elsif p_action='new_time' then
    v_status:='customer_requested_new_time';
  elsif p_action='cancel' then
    v_status:='cancelled_customer';
  else
    raise exception 'invalid action';
  end if;

  update public.orders set status=v_status where id=v_order.id;
  insert into public.order_events(order_id,event_type,to_value,note)
  values(v_order.id,'customer_offer_response',v_status,nullif(v_note,''));
  return jsonb_build_object('status',v_status,'changed',true);
end $$;
revoke all on function public.public_respond_offer(text,text,text,text) from public;
grant execute on function public.public_respond_offer(text,text,text,text) to anon;
