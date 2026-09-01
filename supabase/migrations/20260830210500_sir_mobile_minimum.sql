create or replace function private.enforce_mobile_minimum()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_cfg jsonb;
  v_minimum numeric;
  v_service_subtotal numeric;
begin
  -- A null distance means that the location mode has not been confirmed as mobile.
  -- Special/manual-review orders also keep a null preliminary price.
  if new.distance_km is null or new.preliminary_price is null then
    return new;
  end if;

  select value into v_cfg from public.app_settings where key='travel';
  v_minimum := coalesce((v_cfg->>'minimum_mobile_order')::numeric, 750);
  v_service_subtotal := greatest(new.preliminary_price - coalesce(new.travel_fee,0), 0);

  if v_service_subtotal < v_minimum then
    new.preliminary_price := v_minimum + coalesce(new.travel_fee,0);
  end if;

  return new;
end;
$$;

drop trigger if exists sir_00_mobile_minimum on public.orders;
create trigger sir_00_mobile_minimum
before insert on public.orders
for each row execute function private.enforce_mobile_minimum();
