create or replace function public.approve_order_technology_card(
  p_order_id uuid,
  p_patch jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_card public.order_technology_cards;
begin
  if auth.uid() is null or not private.is_staff(array['owner','admin','manager']) then
    raise exception 'owner/admin/manager access required';
  end if;

  update public.order_technology_cards
  set
    material_guess=coalesce(nullif(p_patch->>'material_guess',''),material_guess),
    contamination_score=case
      when not (p_patch ? 'contamination_score') or jsonb_typeof(p_patch->'contamination_score')='null' then contamination_score
      else (p_patch->>'contamination_score')::integer
    end,
    risk_level=coalesce(nullif(p_patch->>'risk_level',''),risk_level),
    owner_note=case when p_patch ? 'owner_note' then coalesce(p_patch->>'owner_note','') else owner_note end,
    reviewed_by=auth.uid(),
    reviewed_at=now()
  where order_id=p_order_id
  returning * into v_card;

  if not found then raise exception 'technology card not found'; end if;

  update public.orders
  set risk_level=v_card.risk_level
  where id=p_order_id;

  if not found then raise exception 'order not found'; end if;

  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
  values(
    auth.uid(),
    'technology_card_approved',
    'order',
    p_order_id::text,
    jsonb_build_object('risk',v_card.risk_level,'material',v_card.material_guess)
  );

  return jsonb_build_object(
    'order_id',p_order_id,
    'risk_level',v_card.risk_level,
    'reviewed_at',v_card.reviewed_at,
    'reviewed_by',v_card.reviewed_by
  );
end $$;

revoke all on function public.approve_order_technology_card(uuid,jsonb) from public, anon;
grant execute on function public.approve_order_technology_card(uuid,jsonb) to authenticated;
