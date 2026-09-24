create or replace function private.enforce_order_work_gate()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_reviewed boolean;
begin
  if tg_op='INSERT' then
    if new.status in ('in_progress','completed') then
      raise exception 'new order cannot start as in_progress/completed';
    end if;
    return new;
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
      select 1
      from public.order_technology_cards tc
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
  end if;
  return new;
end $$;

drop trigger if exists sir_enforce_order_stop_gate on public.orders;
drop trigger if exists sir_enforce_order_work_gate on public.orders;
create trigger sir_enforce_order_work_gate
before insert or update on public.orders
for each row execute function private.enforce_order_work_gate();

drop function if exists private.enforce_order_stop_gate();
