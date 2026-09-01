alter table public.procedures add column if not exists code text;
alter table public.procedures add column if not exists pass_plan text;
alter table public.procedures add column if not exists drying_rule text;
alter table public.procedures add column if not exists mechanical_method text;
alter table public.procedures add column if not exists chemical_rule text;
alter table public.procedures add column if not exists source_note text;

create unique index if not exists procedures_code_uq on public.procedures(code) where code is not null;

create or replace function private.stamp_guide_change() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_op='UPDATE' and tg_table_name='procedures' then
    new.version:=greatest(coalesce(old.version,1)+1,coalesce(new.version,1));
  end if;
  if auth.uid() is not null then new.updated_by:=auth.uid(); end if;
  new.updated_at:=now();
  return new;
end $$;
revoke all on function private.stamp_guide_change() from public,anon,authenticated;

drop trigger if exists sir_stamp_chemical_change on public.chemicals;
create trigger sir_stamp_chemical_change before insert or update on public.chemicals
for each row execute function private.stamp_guide_change();

drop trigger if exists sir_stamp_procedure_change on public.procedures;
create trigger sir_stamp_procedure_change before insert or update on public.procedures
for each row execute function private.stamp_guide_change();

create or replace function private.audit_guide_change() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_id text;v_action text;
begin
  v_id:=new.id::text;
  v_action:=case when tg_op='INSERT' then tg_table_name||'_created' else tg_table_name||'_updated' end;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),v_action,tg_table_name,v_id,
    case when tg_table_name='chemicals'
      then jsonb_build_object('name',new.name,'brand',new.brand,'verification_status',new.verification_status,'active',new.active)
      else jsonb_build_object('name',new.name,'code',new.code,'surface_type',new.surface_type,'contamination',new.contamination,'risk_level',new.risk_level,'verified',new.verified,'version',new.version)
    end);
  return new;
end $$;
revoke all on function private.audit_guide_change() from public,anon,authenticated;

drop trigger if exists sir_audit_chemical_change on public.chemicals;
create trigger sir_audit_chemical_change after insert or update on public.chemicals
for each row execute function private.audit_guide_change();

drop trigger if exists sir_audit_procedure_change on public.procedures;
create trigger sir_audit_procedure_change after insert or update on public.procedures
for each row execute function private.audit_guide_change();
