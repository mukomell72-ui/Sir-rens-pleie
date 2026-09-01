drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using(id=(select auth.uid()) or private.is_staff(array['owner','admin']));

drop policy if exists settings_manage on public.app_settings;
create policy settings_insert on public.app_settings for insert to authenticated with check(private.is_staff(array['owner','admin']));
create policy settings_update on public.app_settings for update to authenticated using(private.is_staff(array['owner','admin'])) with check(private.is_staff(array['owner','admin']));
create policy settings_delete on public.app_settings for delete to authenticated using(private.is_staff(array['owner','admin']));

drop policy if exists prices_manage on public.price_rules;
create policy prices_insert on public.price_rules for insert to authenticated with check(private.is_staff(array['owner','admin']));
create policy prices_update on public.price_rules for update to authenticated using(private.is_staff(array['owner','admin'])) with check(private.is_staff(array['owner','admin']));
create policy prices_delete on public.price_rules for delete to authenticated using(private.is_staff(array['owner','admin']));

drop policy if exists chemicals_manage on public.chemicals;
create policy chemicals_insert on public.chemicals for insert to authenticated with check(private.is_staff(array['owner','admin']));
create policy chemicals_update on public.chemicals for update to authenticated using(private.is_staff(array['owner','admin'])) with check(private.is_staff(array['owner','admin']));
create policy chemicals_delete on public.chemicals for delete to authenticated using(private.is_staff(array['owner','admin']));

drop policy if exists procedures_manage on public.procedures;
create policy procedures_insert on public.procedures for insert to authenticated with check(private.is_staff(array['owner','admin']));
create policy procedures_update on public.procedures for update to authenticated using(private.is_staff(array['owner','admin'])) with check(private.is_staff(array['owner','admin']));
create policy procedures_delete on public.procedures for delete to authenticated using(private.is_staff(array['owner','admin']));

revoke execute on function public.public_submit_order(jsonb) from authenticated;

create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists orders_assigned_to_idx on public.orders(assigned_to);
create index if not exists appointments_order_id_idx on public.appointments(order_id);
create index if not exists appointments_created_by_idx on public.appointments(created_by);
create index if not exists order_events_order_id_idx on public.order_events(order_id);
create index if not exists order_events_actor_id_idx on public.order_events(actor_id);
create index if not exists audit_events_actor_id_idx on public.audit_events(actor_id);
create index if not exists order_photos_order_id_idx on public.order_photos(order_id);
create index if not exists app_settings_updated_by_idx on public.app_settings(updated_by);
create index if not exists price_rules_updated_by_idx on public.price_rules(updated_by);
create index if not exists chemicals_updated_by_idx on public.chemicals(updated_by);
create index if not exists procedures_updated_by_idx on public.procedures(updated_by);
create index if not exists order_technology_cards_reviewed_by_idx on public.order_technology_cards(reviewed_by);
create index if not exists referrals_referrer_idx on public.referrals(referrer_customer_id);
create index if not exists referrals_referred_idx on public.referrals(referred_customer_id);
create index if not exists referrals_order_idx on public.referrals(order_id);
