create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_staff(allowed text[] default array['owner','admin','manager','worker']) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and active=true and role=any(allowed))
$$;
revoke all on function private.is_staff(text[]) from public;
grant execute on function private.is_staff(text[]) to authenticated;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_manage on public.profiles;
drop policy if exists customers_staff on public.customers;
drop policy if exists orders_read on public.orders;
drop policy if exists orders_create on public.orders;
drop policy if exists orders_edit on public.orders;
drop policy if exists appointments_staff on public.appointments;
drop policy if exists order_events_staff on public.order_events;
drop policy if exists audit_read on public.audit_events;
drop policy if exists audit_write on public.audit_events;
drop policy if exists settings_read on public.app_settings;
drop policy if exists settings_manage on public.app_settings;
drop policy if exists prices_read on public.price_rules;
drop policy if exists prices_manage on public.price_rules;
drop policy if exists referrals_staff on public.referrals;
drop policy if exists chemicals_read on public.chemicals;
drop policy if exists chemicals_manage on public.chemicals;
drop policy if exists procedures_read on public.procedures;
drop policy if exists procedures_manage on public.procedures;
drop policy if exists tech_cards_staff on public.order_technology_cards;

create policy profiles_select on public.profiles for select to authenticated using(id=auth.uid() or private.is_staff(array['owner','admin']));
create policy profiles_manage on public.profiles for update to authenticated using(private.is_staff(array['owner','admin'])) with check(private.is_staff(array['owner','admin']));
create policy customers_staff on public.customers for all to authenticated using(private.is_staff()) with check(private.is_staff());
create policy orders_read on public.orders for select to authenticated using(private.is_staff());
create policy orders_create on public.orders for insert to authenticated with check(private.is_staff(array['owner','admin','manager']));
create policy orders_edit on public.orders for update to authenticated using(private.is_staff()) with check(private.is_staff());
create policy appointments_staff on public.appointments for all to authenticated using(private.is_staff()) with check(private.is_staff());
create policy order_events_staff on public.order_events for all to authenticated using(private.is_staff()) with check(private.is_staff());
create policy audit_read on public.audit_events for select to authenticated using(private.is_staff(array['owner','admin']));
create policy audit_write on public.audit_events for insert to authenticated with check(private.is_staff());
create policy settings_read on public.app_settings for select to authenticated using(private.is_staff());
create policy settings_manage on public.app_settings for all to authenticated using(private.is_staff(array['owner','admin'])) with check(private.is_staff(array['owner','admin']));
create policy prices_read on public.price_rules for select to authenticated using(private.is_staff());
create policy prices_manage on public.price_rules for all to authenticated using(private.is_staff(array['owner','admin'])) with check(private.is_staff(array['owner','admin']));
create policy referrals_staff on public.referrals for all to authenticated using(private.is_staff()) with check(private.is_staff());
create policy chemicals_read on public.chemicals for select to authenticated using(private.is_staff());
create policy chemicals_manage on public.chemicals for all to authenticated using(private.is_staff(array['owner','admin'])) with check(private.is_staff(array['owner','admin']));
create policy procedures_read on public.procedures for select to authenticated using(private.is_staff());
create policy procedures_manage on public.procedures for all to authenticated using(private.is_staff(array['owner','admin'])) with check(private.is_staff(array['owner','admin']));
create policy tech_cards_staff on public.order_technology_cards for all to authenticated using(private.is_staff()) with check(private.is_staff());

drop policy if exists prices_public_read on public.price_rules;
create policy prices_public_read on public.price_rules for select to anon using(active=true);
drop policy if exists settings_public_read on public.app_settings;
create policy settings_public_read on public.app_settings for select to anon using(key in ('company','travel','referral'));

grant select on public.price_rules, public.app_settings to anon;
grant select,insert,update,delete on public.profiles,public.customers,public.orders,public.appointments,public.order_events,public.audit_events,public.app_settings,public.price_rules,public.referrals,public.chemicals,public.procedures,public.order_technology_cards to authenticated;

revoke all on function public.create_profile_for_user() from public, anon, authenticated;
revoke all on function public.current_staff_role() from public, anon, authenticated;
revoke all on function public.is_staff(text[]) from public, anon, authenticated;
