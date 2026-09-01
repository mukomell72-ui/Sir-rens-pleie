insert into public.price_rules(service_code,size_key,light_price,medium_price,heavy_price,metadata) values
('full_interior','5',1690,1990,2390,'{"introductory":true}'::jsonb),
('full_interior','7',1990,2390,2890,'{"introductory":true}'::jsonb),
('full_interior','9',2290,2790,3390,'{"introductory":true}'::jsonb),
('ceiling','5',590,750,950,'{"risk":"elevated"}'::jsonb),
('ceiling','7',690,850,1050,'{"risk":"elevated"}'::jsonb),
('ceiling','9',790,950,1150,'{"risk":"elevated"}'::jsonb),
('sofa','2',500,600,700,'{}'::jsonb),('sofa','3',750,900,1050,'{}'::jsonb),
('sofa','4',900,1100,1300,'{}'::jsonb),('sofa','5',1150,1400,1650,'{}'::jsonb),
('armchair','default',400,500,650,'{}'::jsonb),
('mattress_single','default',450,550,700,'{}'::jsonb),
('mattress_double','default',650,800,1000,'{}'::jsonb)
on conflict(service_code,size_key) do update set light_price=excluded.light_price,medium_price=excluded.medium_price,heavy_price=excluded.heavy_price,metadata=excluded.metadata,updated_at=now();

insert into public.app_settings(key,value,description) values
('company','{"brand":"SIR Rens & Pleie","location":"Kongsberg","radius_km":40,"phone_primary":"+4793953581","phone_secondary":"+4748689164"}'::jsonb,'Public company settings'),
('travel','{"0_10":0,"11_20":150,"21_30":250,"31_40":350,"minimum_mobile_order":750}'::jsonb,'Editable travel fees'),
('referral','{"referrer_credit":200,"new_customer_discount":100,"minimum_order":750}'::jsonb,'Referral program'),
('work_rules','{"working_day_start":"08:00","working_day_end":"20:00","default_buffer_minutes":30}'::jsonb,'Calendar defaults'),
('risk_policy','{"principle":"safety_before_aggressiveness","unknown_material":"stop_and_review","headliner":"minimum_moisture"}'::jsonb,'Technology safety rules')
on conflict(key) do update set value=excluded.value,description=excluded.description,updated_at=now();
