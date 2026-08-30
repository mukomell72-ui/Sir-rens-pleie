create or replace function public.claim_initial_owner(p_code text)
returns boolean
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_uid uuid := auth.uid();
  v_ok boolean := false;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if exists(select 1 from public.profiles where role='owner' and active=true and id<>v_uid) then
    raise exception 'owner already exists';
  end if;

  update private.owner_bootstrap_tokens
     set used_at=now()
   where token_hash=encode(extensions.digest(p_code,'sha256'),'hex')
     and used_at is null
     and expires_at>now()
  returning true into v_ok;
  if coalesce(v_ok,false)=false then raise exception 'invalid or expired setup code'; end if;

  update public.profiles set role='owner',active=true,updated_at=now() where id=v_uid;
  update private.owner_bootstrap_tokens set used_at=coalesce(used_at,now()) where used_at is null;

  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
  values(v_uid,'initial_owner_claimed','profile',v_uid::text,'{}'::jsonb);

  -- First-owner bootstrap is intentionally one-time. Re-enabling it later requires
  -- an explicit database/admin action rather than leaving a permanent elevation RPC.
  execute 'revoke execute on function public.claim_initial_owner(text) from authenticated';
  return true;
end;
$$;
