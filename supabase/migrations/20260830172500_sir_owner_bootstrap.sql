create table if not exists private.owner_bootstrap_tokens (
  token_hash text primary key,
  expires_at timestamptz not null,
  used_at timestamptz
);

create or replace function public.create_profile_for_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,display_name,role,active)
  values(new.id,coalesce(new.raw_user_meta_data->>'display_name',new.email),'worker',false)
  on conflict(id) do nothing;
  return new;
end $$;
revoke all on function public.create_profile_for_user() from public, anon, authenticated;

create or replace function public.claim_initial_owner(p_code text) returns boolean
language plpgsql security definer set search_path=public,private as $$
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
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
  values(v_uid,'initial_owner_claimed','profile',v_uid::text,'{}'::jsonb);
  return true;
end $$;
revoke all on function public.claim_initial_owner(text) from public, anon, authenticated;
grant execute on function public.claim_initial_owner(text) to authenticated;

-- A one-time token hash is inserted out-of-band and is intentionally not stored in Git.
