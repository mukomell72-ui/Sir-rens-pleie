alter table public.chemicals
  add column if not exists stock_status text not null default 'ok',
  add column if not exists stock_note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.chemicals'::regclass
      and conname='chemicals_stock_status_check'
  ) then
    alter table public.chemicals
      add constraint chemicals_stock_status_check
      check (stock_status = any (array['ok'::text,'low'::text,'out'::text]));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='orders') then
    execute 'alter publication supabase_realtime add table public.orders';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='appointments') then
    execute 'alter publication supabase_realtime add table public.appointments';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chemicals') then
    execute 'alter publication supabase_realtime add table public.chemicals';
  end if;
end $$;
