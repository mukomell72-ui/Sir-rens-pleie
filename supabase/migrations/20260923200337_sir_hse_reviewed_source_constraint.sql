do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.chemicals'::regclass
      and conname='chemicals_reviewed_hse_source_check'
  ) then
    alter table public.chemicals add constraint chemicals_reviewed_hse_source_check
      check (
        hse_status not in ('source_reviewed','verified')
        or (
          sds_url is not null
          and sds_url ~ '^https://'
          and hse_verified_at is not null
        )
      );
  end if;
end $$;
