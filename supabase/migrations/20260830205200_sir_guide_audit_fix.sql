create or replace function private.audit_guide_change() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  v_row jsonb:=to_jsonb(new);
  v_id text:=v_row->>'id';
  v_action text:=case when tg_op='INSERT' then tg_table_name||'_created' else tg_table_name||'_updated' end;
  v_meta jsonb;
begin
  if tg_table_name='chemicals' then
    v_meta:=jsonb_build_object(
      'name',v_row->>'name',
      'brand',v_row->>'brand',
      'verification_status',v_row->>'verification_status',
      'active',coalesce((v_row->>'active')::boolean,false)
    );
  else
    v_meta:=jsonb_build_object(
      'name',v_row->>'name',
      'code',v_row->>'code',
      'surface_type',v_row->>'surface_type',
      'contamination',v_row->>'contamination',
      'risk_level',v_row->>'risk_level',
      'verified',coalesce((v_row->>'verified')::boolean,false),
      'version',coalesce((v_row->>'version')::integer,1)
    );
  end if;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),v_action,tg_table_name,v_id,v_meta);
  return new;
end $$;
revoke all on function private.audit_guide_change() from public,anon,authenticated;
