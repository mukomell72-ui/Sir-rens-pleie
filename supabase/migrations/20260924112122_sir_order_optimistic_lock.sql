create or replace function public.save_order_decision(
  p_order_id uuid,
  p_patch jsonb,
  p_appointment jsonb default null
)
returns jsonb
language plpgsql
security invoker
set search_path='public','private'
as $$
declare
  v_order public.orders;
  v_appt public.appointments;
  v_appt_id uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_expected_updated_at timestamptz;
begin
  if auth.uid() is null or not private.is_staff(array['owner','admin','manager']) then
    raise exception 'owner/admin/manager access required';
  end if;

  select * into v_order
  from public.orders
  where id=p_order_id
  for update;
  if not found then raise exception 'order not found'; end if;

  if p_patch ? '_expected_updated_at' then
    begin
      v_expected_updated_at:=(p_patch->>'_expected_updated_at')::timestamptz;
    exception when others then
      raise exception 'invalid expected order version';
    end;
    if v_expected_updated_at is distinct from v_order.updated_at then
      raise exception 'order changed since it was loaded; refresh and retry';
    end if;
  end if;

  if p_appointment is not null and jsonb_typeof(p_appointment)='object' then
    v_start:=(p_appointment->>'starts_at')::timestamptz;
    v_end:=(p_appointment->>'ends_at')::timestamptz;
    if v_start is null or v_end is null or v_end<=v_start then
      raise exception 'invalid appointment interval';
    end if;

    v_appt_id:=nullif(p_appointment->>'id','')::uuid;
    if v_appt_id is not null then
      update public.appointments
      set starts_at=v_start,
          ends_at=v_end,
          tentative=coalesce((p_appointment->>'tentative')::boolean,tentative),
          address=case when p_appointment ? 'address' then nullif(p_appointment->>'address','') else address end
      where id=v_appt_id and order_id=p_order_id
      returning * into v_appt;
      if not found then raise exception 'appointment not found for order'; end if;
    else
      insert into public.appointments(order_id,starts_at,ends_at,tentative,address,created_by)
      values(
        p_order_id,
        v_start,
        v_end,
        coalesce((p_appointment->>'tentative')::boolean,true),
        nullif(p_appointment->>'address',''),
        auth.uid()
      )
      returning * into v_appt;
    end if;
  end if;

  update public.orders
  set
    status=coalesce(nullif(p_patch->>'status',''),status),
    payment_status=coalesce(nullif(p_patch->>'payment_status',''),payment_status),
    risk_level=coalesce(nullif(p_patch->>'risk_level',''),risk_level),
    final_price=case
      when not (p_patch ? 'final_price') then final_price
      when jsonb_typeof(p_patch->'final_price')='null' then null
      else (p_patch->>'final_price')::numeric
    end,
    assigned_to=case
      when not (p_patch ? 'assigned_to') then assigned_to
      when jsonb_typeof(p_patch->'assigned_to')='null' then null
      else (p_patch->>'assigned_to')::uuid
    end,
    internal_note=case
      when p_patch ? 'internal_note' then coalesce(p_patch->>'internal_note','')
      else internal_note
    end
  where id=p_order_id
  returning * into v_order;

  return jsonb_build_object(
    'order_id',v_order.id,
    'status',v_order.status,
    'payment_status',v_order.payment_status,
    'updated_at',v_order.updated_at,
    'appointment_id',v_appt.id
  );
end
$$;

revoke all on function public.save_order_decision(uuid,jsonb,jsonb) from public, anon;
grant execute on function public.save_order_decision(uuid,jsonb,jsonb) to authenticated;

