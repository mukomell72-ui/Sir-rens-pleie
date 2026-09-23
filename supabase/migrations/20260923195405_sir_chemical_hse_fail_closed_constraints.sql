do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.chemicals'::regclass and conname='chemicals_sds_https_check') then
    alter table public.chemicals add constraint chemicals_sds_https_check
      check (sds_url is null or sds_url ~ '^https://');
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.chemicals'::regclass and conname='chemicals_verified_hse_fields_check') then
    alter table public.chemicals add constraint chemicals_verified_hse_fields_check
      check (hse_status <> 'verified' or (
        sds_url is not null and sds_url ~ '^https://'
        and nullif(btrim(sds_language),'') is not null
        and hse_verified_at is not null
        and nullif(btrim(hse_hazards),'') is not null
        and nullif(btrim(hse_ppe),'') is not null
        and nullif(btrim(hse_first_aid),'') is not null
        and nullif(btrim(hse_storage),'') is not null
      ));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.chemicals'::regclass and conname='chemicals_stop_fail_closed_check') then
    alter table public.chemicals add constraint chemicals_stop_fail_closed_check
      check (hse_status <> 'stop' or (risk_level='stop' and approval_required=true));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.chemicals'::regclass and conname='chemicals_high_risk_approval_check') then
    alter table public.chemicals add constraint chemicals_high_risk_approval_check
      check (risk_level not in ('high_risk','stop') or approval_required=true);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.chemicals'::regclass and conname='chemicals_active_verified_hse_check') then
    alter table public.chemicals add constraint chemicals_active_verified_hse_check
      check (not (active=true and verification_status='manufacturer_verified') or hse_status in ('source_reviewed','verified','stop'));
  end if;
end $$;
