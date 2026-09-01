create or replace function public.generate_order_technology_card(p_order_id uuid) returns jsonb
language plpgsql set search_path=public as $$
declare
  v_order public.orders;
  v_risk text:='caution';
  v_existing_risk text;
  v_steps jsonb:='[]'::jsonb;
  v_stop jsonb:='[]'::jsonb;
  v_surfaces text[]:=array[]::text[];
  v_has_headliner boolean:=false;
  v_card public.order_technology_cards;
begin
  if not private.can_access_order(p_order_id) then raise exception 'not allowed'; end if;
  select * into v_order from public.orders where id=p_order_id;
  if not found then raise exception 'order not found'; end if;

  if v_order.service_type='car' then
    if v_order.package_code='full' then
      v_surfaces:=array['textile','carpet','headliner','interior_plastic'];
    elsif v_order.package_code='seats' then
      v_surfaces:=array['textile'];
    else
      select coalesce(array_agg(distinct surface_type) filter(where surface_type is not null),array[]::text[])
        into v_surfaces
      from (
        select case item_code
          when 'seat' then 'textile'
          when 'floor_carpet' then 'carpet'
          when 'trunk' then 'carpet'
          when 'textile_mats' then 'carpet'
          when 'ceiling' then 'headliner'
          when 'door_cards' then 'interior_plastic'
          when 'dashboard_console' then 'interior_plastic'
          when 'interior_plastic' then 'interior_plastic'
          when 'seat_belt' then 'seat_belt'
          when 'child_seat' then 'child_seat'
          else null end as surface_type
        from public.order_items where order_id=p_order_id
      ) q;
    end if;
  elsif v_order.service_type='mattress' then
    v_surfaces:=array['mattress'];
  elsif v_order.service_type in ('sofa','chair') then
    v_surfaces:=array['textile'];
  end if;

  v_has_headliner:='headliner'=any(v_surfaces);

  if v_order.contamination='special' then
    v_risk:='stop';
  else
    select p.risk_level into v_risk
      from public.procedures p
     where p.verified=true
       and p.contamination=v_order.contamination
       and p.surface_type=any(v_surfaces)
     order by case p.risk_level when 'stop' then 4 when 'high_risk' then 3 when 'caution' then 2 else 1 end desc
     limit 1;
    v_risk:=coalesce(v_risk,'caution');
  end if;

  v_existing_risk:=coalesce(v_order.risk_level,'low');
  if (case v_existing_risk when 'stop' then 4 when 'high_risk' then 3 when 'caution' then 2 else 1 end)
     > (case v_risk when 'stop' then 4 when 'high_risk' then 3 when 'caution' then 2 else 1 end) then
    v_risk:=v_existing_risk;
  end if;

  v_steps:=jsonb_build_array(
    'Сделать фото и зафиксировать исходные повреждения до начала работы.',
    'Определить реальный материал на месте. Если материал не совпадает с ожиданием — выбрать соответствующую процедуру и не усиливать химию автоматически.',
    'Выполнить spot-test средства и механического воздействия на незаметном участке.',
    'Сначала максимально удалить сухую грязь до влажной химии.',
    'Для каждой зоны открыть проверенную процедуру SIR: проходы, правило сушки, механика и STOP.',
    'Конкретное средство, разведение и выдержка — только из manufacturer_verified карточки и только при подтверждённой совместимости.'
  );
  if v_has_headliner then
    v_steps:=v_steps||jsonb_build_array('Потолок считать отдельной рискованной зоной: минимальная влага, никакой промывки как ковролина, повтор только после проверки стабильности клея/подложки.');
  end if;
  if v_risk in ('high_risk','stop') then
    v_steps:=v_steps||jsonb_build_array('HIGH RISK/STOP: работник не усиливает обработку самостоятельно. Требуется решение OWNER/менеджера после осмотра.');
  end if;

  v_stop:=jsonb_build_array(
    'Перенос цвета при spot-test.',
    'Липкость, белёсость, изменение оттенка или деформация материала.',
    'Провисание/отклеивание потолка или подозрение на слабый клей.',
    'Неизвестная дорогая/деликатная поверхность без подтверждённой технологии.',
    'Плесень, биологическое или неизвестное опасное загрязнение без отдельного протокола.',
    'Требуется химия или метод, совместимость которых не подтверждена.'
  );

  insert into public.order_technology_cards(order_id,material_guess,material_confidence,risk_level,estimated_minutes,instructions,stop_conditions,reviewed_by,reviewed_at,updated_at)
  values(p_order_id,'Требуется проверка материала на месте',null,v_risk,v_order.estimated_minutes,v_steps,v_stop,null,null,now())
  on conflict(order_id) do update set
    material_guess=excluded.material_guess,
    material_confidence=excluded.material_confidence,
    risk_level=excluded.risk_level,
    estimated_minutes=excluded.estimated_minutes,
    instructions=excluded.instructions,
    stop_conditions=excluded.stop_conditions,
    reviewed_by=null,
    reviewed_at=null,
    updated_at=now()
  returning * into v_card;

  update public.orders set risk_level=v_risk where id=p_order_id and risk_level is distinct from v_risk;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'technology_draft_generated','order',p_order_id::text,jsonb_build_object('risk',v_risk,'surfaces',to_jsonb(v_surfaces)));

  return jsonb_build_object('id',v_card.id,'order_id',v_card.order_id,'risk_level',v_card.risk_level,'instructions',v_card.instructions,'stop_conditions',v_card.stop_conditions,'reviewed_at',v_card.reviewed_at);
end $$;
