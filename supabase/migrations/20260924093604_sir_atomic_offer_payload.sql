create or replace function public.issue_order_confirmation_token(p_order uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_uid uuid := auth.uid();
  v_token text;
  v_order public.orders;
  v_appt public.appointments;
  v_phone_digits text;
begin
  if v_uid is null or not private.is_staff(array['owner','admin','manager']) then
    raise exception 'not allowed';
  end if;

  select * into v_order from public.orders where id=p_order;
  if v_order.id is null then raise exception 'order not found'; end if;
  if v_order.final_price is null or v_order.final_price<=0 then raise exception 'final price required'; end if;

  v_phone_digits:=regexp_replace(coalesce(v_order.phone,''),'[^0-9]','','g');
  if length(v_phone_digits)<6 then raise exception 'valid customer phone required'; end if;

  select * into v_appt
  from public.appointments
  where order_id=p_order
  order by starts_at desc
  limit 1;
  if v_appt.id is null then raise exception 'appointment required'; end if;

  v_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  update public.orders
     set confirmation_token_hash=encode(extensions.digest(v_token,'sha256'),'hex'),
         confirmation_expires_at=now()+interval '7 days',
         offer_sent_at=now(),
         status='awaiting_confirmation'
   where id=p_order
   returning * into v_order;

  return jsonb_build_object(
    'order_no',v_order.order_no,
    'token',v_token,
    'expires_at',v_order.confirmation_expires_at,
    'phone',v_order.phone,
    'service_type',v_order.service_type,
    'final_price',v_order.final_price,
    'appointment_start',v_appt.starts_at,
    'appointment_address',v_appt.address,
    'location_mode',v_appt.location_mode
  );
end $$;

revoke all on function public.issue_order_confirmation_token(uuid) from public, anon;
grant execute on function public.issue_order_confirmation_token(uuid) to authenticated;
