-- Staff can issue an offer using their normal RLS permissions; no definer elevation is needed.
alter function public.issue_order_confirmation_token(uuid) security invoker;

-- Public offer endpoints are token-gated and intentionally anonymous. Signed-in users do not need direct EXECUTE.
revoke execute on function public.public_get_offer(text,text) from authenticated;
revoke execute on function public.public_respond_offer(text,text,text,text) from authenticated;
grant execute on function public.public_get_offer(text,text) to anon;
grant execute on function public.public_respond_offer(text,text,text,text) to anon;

-- Avoid overlapping permissive SELECT policies while keeping manager write access.
drop policy if exists order_items_manage on public.order_items;
create policy order_items_insert on public.order_items for insert to authenticated
  with check(private.is_staff(array['owner','admin','manager']));
create policy order_items_update on public.order_items for update to authenticated
  using(private.is_staff(array['owner','admin','manager']))
  with check(private.is_staff(array['owner','admin','manager']));
create policy order_items_delete on public.order_items for delete to authenticated
  using(private.is_staff(array['owner','admin','manager']));

drop policy if exists order_photos_manage on public.order_photos;
create policy order_photos_insert on public.order_photos for insert to authenticated
  with check(private.is_staff(array['owner','admin','manager']));
create policy order_photos_update on public.order_photos for update to authenticated
  using(private.is_staff(array['owner','admin','manager']))
  with check(private.is_staff(array['owner','admin','manager']));
create policy order_photos_delete on public.order_photos for delete to authenticated
  using(private.is_staff(array['owner','admin','manager']));
