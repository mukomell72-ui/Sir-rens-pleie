create or replace function public.raise_order_stop(
  p_order_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_note text;
begin
  if auth.uid() is null or not private.can_access_order(p_order_id) then
    raise exception 'order access required';
  end if;

  v_note:=left(coalesce(nullif(trim(p_reason),''),'Safety STOP raised'),500);

  update public.order_technology_cards
  set risk_level='stop',
      reviewed_by=null,
      reviewed_at=null,
      owner_note=case
        when coalesce(owner_note,'')='' then '[STOP] '||v_note
        else owner_note||E'\n[STOP] '||v_note
      end,
      updated_at=now()
  where order_id=p_order_id;

  update public.orders
  set risk_level='stop',
      internal_note=case
        when coalesce(internal_note,'')='' then '[STOP] '||v_note
        else internal_note||E'\n[STOP] '||v_note
      end
  where id=p_order_id;

  if not found then raise exception 'order not found'; end if;

  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'order_stop_raised','order',p_order_id::text,jsonb_build_object('reason',v_note));

  return jsonb_build_object('order_id',p_order_id,'risk_level','stop','review_invalidated',true);
end $$;

revoke all on function public.raise_order_stop(uuid,text) from public, anon;
grant execute on function public.raise_order_stop(uuid,text) to authenticated;

create or replace function private.guard_order_risk_downgrade()
returns trigger
language plpgsql
set search_path = public, private
as $$
declare
  v_ok boolean;
begin
  if tg_op='UPDATE'
     and old.risk_level='stop'
     and new.risk_level is distinct from 'stop' then
    if not private.is_staff(array['owner','admin','manager']) then
      raise exception 'STOP can only be cleared by owner/admin/manager after technology review';
    end if;

    select exists(
      select 1
      from public.order_technology_cards tc
      where tc.order_id=new.id
        and tc.reviewed_at is not null
        and tc.reviewed_by is not null
        and tc.risk_level=new.risk_level
        and tc.risk_level<>'stop'
    ) into v_ok;

    if not coalesce(v_ok,false) then
      raise exception 'STOP requires a newly reviewed technology card before clearance';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists sir_guard_order_risk_downgrade on public.orders;
create trigger sir_guard_order_risk_downgrade
before update on public.orders
for each row execute function private.guard_order_risk_downgrade();
