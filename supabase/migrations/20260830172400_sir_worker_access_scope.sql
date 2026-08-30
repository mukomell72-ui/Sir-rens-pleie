create or replace function private.can_access_order(p_order uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.orders o
    join public.profiles p on p.id=(select auth.uid()) and p.active=true
    where o.id=p_order
      and (p.role in ('owner','admin','manager') or (p.role='worker' and o.assigned_to=p.id))
  )
$$;
revoke all on function private.can_access_order(uuid) from public;
grant execute on function private.can_access_order(uuid) to authenticated;

drop policy if exists customers_staff on public.customers;
create policy customers_staff on public.customers for all to authenticated
  using(private.is_staff(array['owner','admin','manager']))
  with check(private.is_staff(array['owner','admin','manager']));

drop policy if exists orders_read on public.orders;
create policy orders_read on public.orders for select to authenticated
  using(private.is_staff(array['owner','admin','manager']) or assigned_to=(select auth.uid()));

drop policy if exists orders_edit on public.orders;
create policy orders_edit on public.orders for update to authenticated
  using(private.is_staff(array['owner','admin','manager']) or assigned_to=(select auth.uid()))
  with check(private.is_staff(array['owner','admin','manager']) or assigned_to=(select auth.uid()));

drop policy if exists appointments_staff on public.appointments;
create policy appointments_select on public.appointments for select to authenticated using(private.can_access_order(order_id));
create policy appointments_insert on public.appointments for insert to authenticated with check(private.is_staff(array['owner','admin','manager']));
create policy appointments_update on public.appointments for update to authenticated using(private.is_staff(array['owner','admin','manager'])) with check(private.is_staff(array['owner','admin','manager']));
create policy appointments_delete on public.appointments for delete to authenticated using(private.is_staff(array['owner','admin','manager']));

drop policy if exists order_events_staff on public.order_events;
create policy order_events_select on public.order_events for select to authenticated using(private.can_access_order(order_id));
create policy order_events_insert on public.order_events for insert to authenticated with check(private.can_access_order(order_id));

drop policy if exists referrals_staff on public.referrals;
create policy referrals_staff on public.referrals for all to authenticated
  using(private.is_staff(array['owner','admin','manager'])) with check(private.is_staff(array['owner','admin','manager']));

drop policy if exists tech_cards_staff on public.order_technology_cards;
create policy tech_cards_select on public.order_technology_cards for select to authenticated using(private.can_access_order(order_id));
create policy tech_cards_insert on public.order_technology_cards for insert to authenticated with check(private.is_staff(array['owner','admin','manager']));
create policy tech_cards_update on public.order_technology_cards for update to authenticated using(private.is_staff(array['owner','admin','manager'])) with check(private.is_staff(array['owner','admin','manager']));

drop policy if exists order_photos_staff on public.order_photos;
create policy order_photos_select on public.order_photos for select to authenticated using(private.can_access_order(order_id));
create policy order_photos_manage on public.order_photos for all to authenticated
  using(private.is_staff(array['owner','admin','manager'])) with check(private.is_staff(array['owner','admin','manager']));
