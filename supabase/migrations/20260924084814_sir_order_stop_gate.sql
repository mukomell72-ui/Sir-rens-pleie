create or replace function private.enforce_order_stop_gate()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op='INSERT' then
    if new.status in ('in_progress','completed') and new.risk_level='stop' then
      raise exception 'STOP risk blocks work start/completion';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status
     and new.status in ('in_progress','completed')
     and new.risk_level='stop' then
    raise exception 'STOP risk blocks work start/completion';
  end if;
  return new;
end $$;

drop trigger if exists sir_enforce_order_stop_gate on public.orders;
create trigger sir_enforce_order_stop_gate
before insert or update on public.orders
for each row execute function private.enforce_order_stop_gate();
