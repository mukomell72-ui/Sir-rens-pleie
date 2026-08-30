alter table public.chemicals add column if not exists use_role text not null default 'general';
alter table public.chemicals add column if not exists risk_level text not null default 'caution';
alter table public.chemicals add column if not exists approval_required boolean not null default false;
alter table public.chemicals add column if not exists technology_note text;

do $$ begin
  if not exists(select 1 from pg_constraint where conname='chemicals_risk_level_check' and conrelid='public.chemicals'::regclass) then
    alter table public.chemicals add constraint chemicals_risk_level_check check(risk_level in ('low','caution','high_risk','stop'));
  end if;
  if not exists(select 1 from pg_constraint where conname='chemicals_brand_name_key' and conrelid='public.chemicals'::regclass) then
    alter table public.chemicals add constraint chemicals_brand_name_key unique(brand,name);
  end if;
end $$;
