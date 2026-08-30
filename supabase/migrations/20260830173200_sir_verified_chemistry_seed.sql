create unique index if not exists chemicals_name_ci_uq on public.chemicals(lower(name)) where active=true;

insert into public.chemicals(name,brand,category,intended_surfaces,prohibited_surfaces,dilution,application_method,dwell_time,follow_up,warnings,verification_status,source_note)
select 'Green Star','Koch-Chemie','cleaner',array['vehicle interior','textiles','vehicle exterior','engine'],array[]::text[],
'Interior/textiles: 1:10–1:20. Exterior/engine: 1:5–1:30.',
'For interior/textiles, apply according to soil level and remove residues with a damp cloth or wet/dry vacuum. For exterior, rinse thoroughly with high pressure.',
'Short contact time; do not allow to dry.',
'Remove product residues thoroughly. Koch-Chemie recommends a foam inhibitor for spray-extraction/carpet machines.',
'Do not use on hot surfaces. Do not allow to dry. Check suitability and compatibility before use.',
'manufacturer_verified','https://www.koch-chemie.com/no/produkter/green_star'
where not exists(select 1 from public.chemicals where lower(name)=lower('Green Star') and active=true);

insert into public.chemicals(name,brand,category,intended_surfaces,prohibited_surfaces,dilution,application_method,dwell_time,follow_up,warnings,verification_status,source_note)
select 'Plast Star siliconölfrei','Koch-Chemie','exterior care',array['external plastic','rubber','door seals','tyre sidewall'],array['pedals','steering wheel','tyre tread'],
'Ready to use.',
'Apply evenly with a sponge to a clean, dry surface, rub in thoroughly and leave to dry completely.',
'Leave to dry completely.',
'No additional step required unless the specific job plan calls for one.',
'Do not use where slipperiness is undesirable. Check suitability and compatibility before use.',
'manufacturer_verified','https://www.koch-chemie.com/en/products/plast_star_siliconoelfrei'
where not exists(select 1 from public.chemicals where lower(name)=lower('Plast Star siliconölfrei') and active=true);

insert into public.chemicals(name,brand,category,intended_surfaces,prohibited_surfaces,dilution,application_method,dwell_time,follow_up,warnings,verification_status,source_note)
select 'NanoMagicShampoo','Koch-Chemie','shampoo',array['automotive paintwork'],array[]::text[],
'50 ml in 10 L warm water.',
'Wash vehicle with a suitable wash pad, then rinse with a soft water jet.',
'No separate dwell step specified by manufacturer.',
'Remove remaining water with a suitable drying cloth.',
'Use only on suitable automotive paintwork and follow product information.',
'manufacturer_verified','https://www.koch-chemie.com/no/produkter/nanomagicshampoo_1'
where not exists(select 1 from public.chemicals where lower(name)=lower('NanoMagicShampoo') and active=true);

insert into public.chemicals(name,brand,category,intended_surfaces,prohibited_surfaces,dilution,application_method,dwell_time,follow_up,warnings,verification_status,source_note)
select 'CARPRO ReTyre','CARPRO','tyre cleaner',array['tyres','most modern clear-coated wheels'],array['sensitive finishes'],
'Ready to use.',
'Rinse loose dirt, spray generously on rubber, allow to foam, agitate with a medium-hard brush, then rinse thoroughly.',
'30 seconds before agitation.',
'Repeat only until the suds on the rubber are white, rinsing between cycles.',
'Do not allow to dry on wheels or other surfaces. Do not use on sensitive surfaces or finishes.',
'manufacturer_verified','https://carpro.global/product/retyre/'
where not exists(select 1 from public.chemicals where lower(name)=lower('CARPRO ReTyre') and active=true);

insert into public.chemicals(name,brand,category,intended_surfaces,prohibited_surfaces,dilution,application_method,dwell_time,follow_up,warnings,verification_status,source_note)
select 'CARPRO DarkSide','CARPRO','tyre protection',array['clean dry tyre sidewall'],array['wet tyres','tyre tread'],
'Ready to use.',
'Clean and dry tyre thoroughly. Apply 2–3 squirts to a tyre or microfibre applicator and spread evenly over the tyre wall.',
'Allow to dry for 1–2 hours; avoid water contact during this period.',
'No water contact during cure.',
'Apply only to a clean, dry tyre sidewall and keep away from the tread.',
'manufacturer_verified','https://www.carpro.global/product/darkside/'
where not exists(select 1 from public.chemicals where lower(name)=lower('CARPRO DarkSide') and active=true);
