create or replace function private.guard_order_risk_downgrade()
returns trigger
language plpgsql
set search_path = public, private
as $$
declare
  v_old_rank integer;
  v_new_rank integer;
  v_ok boolean;
begin
  if tg_op<>'UPDATE' or new.risk_level is not distinct from old.risk_level then
    return new;
  end if;

  v_old_rank:=case old.risk_level when 'stop' then 4 when 'high_risk' then 3 when 'caution' then 2 else 1 end;
  v_new_rank:=case new.risk_level when 'stop' then 4 when 'high_risk' then 3 when 'caution' then 2 else 1 end;

  if v_new_rank < v_old_rank and v_old_rank>=3 then
    if not private.is_staff(array['owner','admin']) then
      raise exception 'HIGH_RISK/STOP can only be lowered by owner/admin after technology review';
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
      raise exception 'risk downgrade requires a newly reviewed technology card';
    end if;
  end if;
  return new;
end $$;
