create or replace function private.enforce_order_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.order_id::text, 0));
  select count(*) into v_count from public.order_photos where order_id=new.order_id;
  if v_count >= 5 then
    raise exception 'photo limit reached';
  end if;
  return new;
end;
$$;

drop trigger if exists sir_order_photo_limit on public.order_photos;
create trigger sir_order_photo_limit
before insert on public.order_photos
for each row execute function private.enforce_order_photo_limit();
