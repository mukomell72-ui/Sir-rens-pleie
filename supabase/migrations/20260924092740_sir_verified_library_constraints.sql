do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.procedures'::regclass
      and conname='procedures_verified_completeness_check'
  ) then
    alter table public.procedures
      add constraint procedures_verified_completeness_check
      check (
        not verified
        or (
          nullif(btrim(name),'') is not null
          and nullif(btrim(code),'') is not null
          and nullif(btrim(surface_type),'') is not null
          and contamination in ('light','medium','heavy','special')
          and jsonb_typeof(steps)='array'
          and jsonb_array_length(steps)>0
          and jsonb_typeof(stop_conditions)='array'
          and jsonb_array_length(stop_conditions)>0
          and nullif(btrim(pass_plan),'') is not null
          and nullif(btrim(drying_rule),'') is not null
          and nullif(btrim(chemical_rule),'') is not null
          and nullif(btrim(source_note),'') is not null
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.procedures'::regclass
      and conname='procedures_contamination_check'
  ) then
    alter table public.procedures
      add constraint procedures_contamination_check
      check (contamination is null or contamination in ('light','medium','heavy','special'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.procedures'::regclass
      and conname='procedures_version_positive_check'
  ) then
    alter table public.procedures
      add constraint procedures_version_positive_check
      check (version >= 1);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.chemicals'::regclass
      and conname='chemicals_manufacturer_verified_completeness_check'
  ) then
    alter table public.chemicals
      add constraint chemicals_manufacturer_verified_completeness_check
      check (
        verification_status <> 'manufacturer_verified'
        or (
          source_note is not null
          and source_note ~ '^https://'
          and nullif(btrim(dilution),'') is not null
          and nullif(btrim(application_method),'') is not null
          and coalesce(cardinality(intended_surfaces),0) > 0
        )
      );
  end if;
end $$;
