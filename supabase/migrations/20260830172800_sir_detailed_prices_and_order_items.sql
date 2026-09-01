create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_code text not null,
  size_key text not null default 'default',
  quantity integer not null default 1 check(quantity between 1 and 50),
  contamination text,
  unit_price numeric(10,2),
  line_total numeric(10,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.order_items enable row level security;
drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items for select to authenticated using(private.can_access_order(order_id));
drop policy if exists order_items_manage on public.order_items;
create policy order_items_manage on public.order_items for all to authenticated
  using(private.is_staff(array['owner','admin','manager']))
  with check(private.is_staff(array['owner','admin','manager']));
grant select,insert,update,delete on public.order_items to authenticated;
create index if not exists order_items_order_id_idx on public.order_items(order_id);

insert into public.price_rules(service_code,size_key,light_price,medium_price,heavy_price,metadata) values
('seat','default',250,300,350,'{"unit":"seat"}'::jsonb),
('seat_discounted','default',150,200,250,'{"positions":[4,7,8],"unit":"seat"}'::jsonb),
('floor_carpet','5',390,490,650,'{}'::jsonb),
('floor_carpet','7',490,590,750,'{}'::jsonb),
('floor_carpet','9',590,690,850,'{}'::jsonb),
('trunk','standard',250,350,450,'{}'::jsonb),
('trunk','large',350,450,550,'{}'::jsonb),
('door_card','1',100,125,150,'{"unit":"piece"}'::jsonb),
('door_cards','4',350,450,550,'{"quantity":4}'::jsonb),
('dashboard_console','default',200,250,300,'{}'::jsonb),
('interior_plastic','default',350,450,550,'{}'::jsonb),
('textile_mats','4',200,250,300,'{"quantity":4}'::jsonb),
('seat_belt','1',75,100,125,'{"unit":"piece"}'::jsonb),
('interior_glass','default',150,200,250,'{}'::jsonb),
('child_seat','default',250,350,450,'{}'::jsonb),
('extra_pet_hair','default',200,200,350,'{}'::jsonb),
('extra_odor','default',250,250,350,'{}'::jsonb)
on conflict(service_code,size_key) do update set
  light_price=excluded.light_price,
  medium_price=excluded.medium_price,
  heavy_price=excluded.heavy_price,
  metadata=excluded.metadata,
  active=true,
  updated_at=now();
