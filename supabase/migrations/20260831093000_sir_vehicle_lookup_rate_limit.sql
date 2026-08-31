create table if not exists public.vehicle_lookup_rate_limits (
  window_name text not null check (window_name in ('minute','day')),
  bucket_start timestamptz not null,
  client_hash text not null check (length(client_hash) between 16 and 128),
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (window_name, bucket_start, client_hash)
);

alter table public.vehicle_lookup_rate_limits enable row level security;
revoke all on table public.vehicle_lookup_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.vehicle_lookup_rate_limits to service_role;

create or replace function public.internal_consume_vehicle_lookup_quota(p_client_hash text)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_minute_count integer;
  v_day_count integer;
  v_minute timestamptz := date_trunc('minute', now());
  v_day timestamptz := date_trunc('day', now());
begin
  if p_client_hash is null or length(p_client_hash) < 16 or length(p_client_hash) > 128 then
    return false;
  end if;

  insert into public.vehicle_lookup_rate_limits(window_name,bucket_start,client_hash,request_count,updated_at)
  values ('minute',v_minute,p_client_hash,1,now())
  on conflict (window_name,bucket_start,client_hash)
  do update set request_count=public.vehicle_lookup_rate_limits.request_count+1, updated_at=now()
  returning request_count into v_minute_count;

  insert into public.vehicle_lookup_rate_limits(window_name,bucket_start,client_hash,request_count,updated_at)
  values ('day',v_day,p_client_hash,1,now())
  on conflict (window_name,bucket_start,client_hash)
  do update set request_count=public.vehicle_lookup_rate_limits.request_count+1, updated_at=now()
  returning request_count into v_day_count;

  if random() < 0.02 then
    delete from public.vehicle_lookup_rate_limits where bucket_start < now()-interval '2 days';
  end if;

  return v_minute_count <= 20 and v_day_count <= 200;
end
$$;

revoke all on function public.internal_consume_vehicle_lookup_quota(text) from public, anon, authenticated;
grant execute on function public.internal_consume_vehicle_lookup_quota(text) to service_role;
