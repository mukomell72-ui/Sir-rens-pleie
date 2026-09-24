drop policy if exists vehicle_lookup_rate_limits_deny_clients on public.vehicle_lookup_rate_limits;
create policy vehicle_lookup_rate_limits_deny_clients
on public.vehicle_lookup_rate_limits
for all
to anon, authenticated
using (false)
with check (false);
