alter function public.generate_order_technology_card(uuid) security invoker;

-- Storage paths are created as <order_uuid>/<random_file> by order-photo-upload.
drop policy if exists sir_order_photos_staff_read on storage.objects;
create policy sir_order_photos_staff_read on storage.objects for select to authenticated
using(
  bucket_id='order-photos'
  and array_length(storage.foldername(name),1)>=1
  and private.can_access_order(((storage.foldername(name))[1])::uuid)
);

drop policy if exists sir_order_photos_staff_delete on storage.objects;
create policy sir_order_photos_staff_delete on storage.objects for delete to authenticated
using(
  bucket_id='order-photos'
  and private.is_staff(array['owner','admin','manager'])
  and array_length(storage.foldername(name),1)>=1
  and private.can_access_order(((storage.foldername(name))[1])::uuid)
);
