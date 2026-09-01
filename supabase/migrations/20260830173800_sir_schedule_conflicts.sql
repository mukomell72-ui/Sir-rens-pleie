create or replace function private.prevent_appointment_overlap() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  v_conflict text;
begin
  if exists (
    select 1
    from public.appointments a
    join public.orders o on o.id=a.order_id
    where a.id is distinct from new.id
      and a.order_id is distinct from new.order_id
      and o.status not in ('cancelled_customer','cancelled_sir','no_show')
      and new.starts_at < (a.ends_at + make_interval(mins => greatest(coalesce(new.buffer_minutes,0),coalesce(a.buffer_minutes,0))))
      and (new.ends_at + make_interval(mins => greatest(coalesce(new.buffer_minutes,0),coalesce(a.buffer_minutes,0)))) > a.starts_at
  ) then
    select coalesce(o.order_no,'другой заказ') into v_conflict
    from public.appointments a
    join public.orders o on o.id=a.order_id
    where a.id is distinct from new.id
      and a.order_id is distinct from new.order_id
      and o.status not in ('cancelled_customer','cancelled_sir','no_show')
      and new.starts_at < (a.ends_at + make_interval(mins => greatest(coalesce(new.buffer_minutes,0),coalesce(a.buffer_minutes,0))))
      and (new.ends_at + make_interval(mins => greatest(coalesce(new.buffer_minutes,0),coalesce(a.buffer_minutes,0)))) > a.starts_at
    order by a.starts_at limit 1;
    raise exception 'calendar conflict with %', v_conflict;
  end if;
  return new;
end $$;
revoke all on function private.prevent_appointment_overlap() from public;

drop trigger if exists sir_prevent_appointment_overlap on public.appointments;
create trigger sir_prevent_appointment_overlap
before insert or update of starts_at,ends_at,buffer_minutes on public.appointments
for each row execute function private.prevent_appointment_overlap();

create or replace function public.calendar_free_windows(p_day date) returns table(starts_at timestamptz,ends_at timestamptz)
language plpgsql security invoker set search_path=public as $$
declare
  v_cfg jsonb;
  v_start time;
  v_end time;
  v_cursor timestamptz;
  v_day_end timestamptz;
  v_row record;
  v_tz text:='Europe/Oslo';
begin
  if not private.is_staff(array['owner','admin','manager']) then raise exception 'not allowed'; end if;
  select value into v_cfg from public.app_settings where key='work_rules';
  v_start:=coalesce((v_cfg->>'working_day_start')::time,'08:00'::time);
  v_end:=coalesce((v_cfg->>'working_day_end')::time,'20:00'::time);
  v_cursor:=(p_day::timestamp+v_start) at time zone v_tz;
  v_day_end:=(p_day::timestamp+v_end) at time zone v_tz;

  for v_row in
    select a.starts_at,a.ends_at,a.buffer_minutes
    from public.appointments a join public.orders o on o.id=a.order_id
    where a.starts_at < v_day_end and a.ends_at > v_cursor
      and o.status not in ('cancelled_customer','cancelled_sir','no_show')
    order by a.starts_at
  loop
    if v_row.starts_at>v_cursor then
      starts_at:=v_cursor; ends_at:=least(v_row.starts_at,v_day_end); return next;
    end if;
    v_cursor:=greatest(v_cursor,v_row.ends_at+make_interval(mins=>coalesce(v_row.buffer_minutes,0)));
    if v_cursor>=v_day_end then return; end if;
  end loop;
  if v_cursor<v_day_end then starts_at:=v_cursor;ends_at:=v_day_end;return next;end if;
end $$;
revoke all on function public.calendar_free_windows(date) from public,anon,authenticated;
grant execute on function public.calendar_free_windows(date) to authenticated;
