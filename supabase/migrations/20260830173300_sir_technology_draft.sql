create or replace function public.generate_order_technology_card(p_order_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_order public.orders;
  v_risk text:='low';
  v_steps jsonb:='[]'::jsonb;
  v_stop jsonb:='[]'::jsonb;
  v_has_headliner boolean:=false;
  v_card public.order_technology_cards;
begin
  if not private.can_access_order(p_order_id) then raise exception 'not allowed'; end if;
  select * into v_order from public.orders where id=p_order_id;
  if not found then raise exception 'order not found'; end if;

  v_has_headliner := v_order.service_type='car' and (
    v_order.package_code='full' or exists(select 1 from public.order_items where order_id=p_order_id and item_code='ceiling')
  );

  if v_order.contamination='special' then v_risk:='stop';
  elsif v_order.contamination='heavy' or v_has_headliner then v_risk:='caution';
  else v_risk:='low'; end if;

  v_steps:=jsonb_build_array(
    'Сделать фото и зафиксировать исходные повреждения до начала работы.',
    'Определить материал на месте. Если материал неизвестен — не усиливать химию автоматически.',
    'Выполнить spot-test средства и механического воздействия на незаметном участке.',
    'Сначала максимально удалить сухую грязь пылесосом/щёткой до влажной химии.',
    'Выбирать средство только из SIR Guide со статусом manufacturer_verified и только для разрешённой поверхности.'
  );

  if v_order.contamination='light' then
    v_steps:=v_steps||jsonb_build_array('Лёгкое загрязнение: один полноценный щадящий цикл. Повтор — только локально после оценки результата.');
  elsif v_order.contamination='medium' then
    v_steps:=v_steps||jsonb_build_array('Среднее загрязнение: предварительная обработка, основной проход, хорошая экстракция и локальный повтор только при необходимости. Полное высыхание между проходами устойчивого текстиля не обязательно, если предыдущий раствор максимально извлечён и материал не переувлажнён.');
  elsif v_order.contamination='heavy' then
    v_steps:=v_steps||jsonb_build_array('Сильное загрязнение: работать многоэтапно. После каждого этапа сначала удалить предыдущий раствор и оценить материал; не накапливать влагу. При сомнении дать зоне стабилизироваться/подсохнуть перед следующим усилением.');
  else
    v_steps:=v_steps||jsonb_build_array('Особое состояние: влажную или усиленную обработку не начинать до ручной оценки владельцем/менеджером.');
  end if;

  if v_has_headliner then
    v_steps:=v_steps||jsonb_build_array(
      'Потолок: отдельно проверить провисание, края, старый клей и перенос цвета.',
      'Потолок: использовать минимально необходимое увлажнение. Не промывать и не насыщать основу жидкостью как ковролин.',
      'Потолок: второй локальный этап только после оценки стабильности материала; при размягчении, деформации или подозрении на клей — STOP.'
    );
  end if;

  if v_order.service_type in ('sofa','mattress') then
    v_steps:=v_steps||jsonb_build_array('Мебель/матрас: перед передачей клиенту обеспечить полное высыхание и предупредить о времени сушки.');
  end if;

  v_stop:=jsonb_build_array(
    'Перенос цвета при spot-test.',
    'Липкость, белёсость, изменение оттенка или деформация материала.',
    'Провисающий/отклеивающийся потолок или подозрение на слабый клей.',
    'Неизвестная дорогая/деликатная ткань без подтверждённой технологии.',
    'Плесень, биологическое загрязнение или неизвестное опасное загрязнение.',
    'Повреждённое покрытие кожи/экокожи, которое ухудшается при тесте.'
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
  values(auth.uid(),'technology_draft_generated','order',p_order_id::text,jsonb_build_object('risk',v_risk));

  return jsonb_build_object('id',v_card.id,'order_id',v_card.order_id,'risk_level',v_card.risk_level,'instructions',v_card.instructions,'stop_conditions',v_card.stop_conditions,'reviewed_at',v_card.reviewed_at);
end $$;
revoke all on function public.generate_order_technology_card(uuid) from public;
grant execute on function public.generate_order_technology_card(uuid) to authenticated;
