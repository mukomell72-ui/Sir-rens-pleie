create or replace function public.save_order_decision(
  p_order_id uuid,
  p_patch jsonb,
  p_appointment jsonb default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_order public.orders;
  v_appt public.appointments;
  v_appt_id uuid;
  v_start timestamptz;
  v_end timestamptz;
begin
  if auth.uid() is null or not private.is_staff(array['owner','admin','manager']) then
    raise exception 'owner/admin/manager access required';
  end if;

  select * into v_order
  from public.orders
  where id=p_order_id
  for update;
  if not found then raise exception 'order not found'; end if;

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
end $$;

create or replace function private.enforce_order_work_gate()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_reviewed boolean;
  v_has_appointment boolean;
begin
  if tg_op='INSERT' then
    if new.status in ('in_progress','completed') then
      raise exception 'new order cannot start as in_progress/completed';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status and new.status='scheduled' then
    select exists(
      select 1 from public.appointments a where a.order_id=new.id
    ) into v_has_appointment;
    if not coalesce(v_has_appointment,false) then
      raise exception 'appointment required before scheduling';
    end if;
  end if;

  if new.status is distinct from old.status and new.status='in_progress' then
    if old.status not in ('confirmed','scheduled','completed') then
      raise exception 'order must be confirmed or scheduled before work starts';
    end if;
    if new.risk_level='stop' then
      raise exception 'STOP risk blocks work start';
    end if;
    if new.assigned_to is null then
      raise exception 'worker must be assigned before work starts';
    end if;
    if new.final_price is null or new.final_price<=0 then
      raise exception 'final price must be agreed before work starts';
    end if;
    select exists(
      select 1 from public.order_technology_cards tc
      where tc.order_id=new.id
        and tc.reviewed_at is not null
        and tc.reviewed_by is not null
        and tc.risk_level<>'stop'
    ) into v_reviewed;
    if not coalesce(v_reviewed,false) then
      raise exception 'reviewed technology card required before work starts';
    end if;
  end if;

  if new.status is distinct from old.status and new.status='completed' then
    if old.status<>'in_progress' then
      raise exception 'order must be in progress before completion';
    end if;
    if new.risk_level='stop' then
      raise exception 'STOP risk blocks work completion';
    end if;
    if new.assigned_to is null or new.final_price is null or new.final_price<=0 then
      raise exception 'assigned worker and final price required before completion';
    end if;
    select exists(
      select 1 from public.order_technology_cards tc
      where tc.order_id=new.id
        and tc.reviewed_at is not null
        and tc.reviewed_by is not null
        and tc.risk_level<>'stop'
    ) into v_reviewed;
    if not coalesce(v_reviewed,false) then
      raise exception 'reviewed technology card required before completion';
    end if;
  end if;
  return new;
end $$;
