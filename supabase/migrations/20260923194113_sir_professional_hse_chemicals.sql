alter table public.chemicals
  add column if not exists hse_status text not null default 'unverified',
  add column if not exists sds_url text,
  add column if not exists sds_language text,
  add column if not exists sds_revision text,
  add column if not exists hse_verified_at date,
  add column if not exists hse_hazards text,
  add column if not exists hse_ppe text,
  add column if not exists hse_first_aid text,
  add column if not exists hse_storage text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.chemicals'::regclass
      and conname='chemicals_hse_status_check'
  ) then
    alter table public.chemicals
      add constraint chemicals_hse_status_check
      check (hse_status in ('unverified','source_reviewed','verified','stop'));
  end if;
end $$;

create index if not exists chemicals_active_verification_hse_idx
  on public.chemicals(active, verification_status, hse_status);

update public.chemicals
set
  hse_status='verified',
  sds_url='https://media.koch-chemie.com/pdf/SDBL/Green_Star_Art-__291999_291999_0006_NO.pdf',
  sds_language='no',
  sds_revision='09.09.2026 / 0006',
  hse_verified_at=date '2026-09-23',
  hse_hazards='H315 Irriterer huden. H318 Gir alvorlig øyeskade.',
  hse_ppe='Vernehansker og øyevern/ansiktsvern ved håndtering av konsentrat og sprøyting. Følg SDS avsnitt 8.',
  hse_first_aid='Ved øyekontakt: skyll grundig med mye vann i flere minutter, fjern kontaktlinser om mulig og kontakt umiddelbart Giftinformasjonen/lege i tråd med SDS.',
  hse_storage='Oppbevar tett lukket og korrekt merket etter SDS avsnitt 7.',
  risk_level='high_risk',
  approval_required=true,
  source_note='https://www.koch-chemie.com/no/produkter/green_star'
where brand='Koch-Chemie' and name='Green Star';

update public.chemicals
set
  hse_status='source_reviewed',
  sds_url=coalesce(sds_url,source_note),
  sds_language=coalesce(sds_language,'no'),
  hse_verified_at=date '2026-09-23'
where brand='Koch-Chemie' and name in ('Eulex','Fleckenwasser','Fresh Up','Glass Cleaner','Leather Star','NanoMagicShampoo','Plast Star siliconölfrei','Pol Star');

update public.chemicals
set risk_level='high_risk', approval_required=true
where brand='Koch-Chemie' and name in ('Eulex','Fleckenwasser');

update public.chemicals
set risk_level='caution'
where brand='Koch-Chemie' and name in ('Fresh Up','Glass Cleaner','Leather Star','NanoMagicShampoo','Plast Star siliconölfrei','Pol Star');

update public.chemicals
set
  hse_status='source_reviewed',
  sds_url=coalesce(sds_url,source_note),
  sds_language=coalesce(sds_language,'no'),
  hse_verified_at=date '2026-09-23',
  risk_level='high_risk',
  approval_required=true
where brand='CARPRO' and name in ('CARPRO DarkSide','CARPRO ReTyre');

insert into public.chemicals
(brand,name,category,intended_surfaces,prohibited_surfaces,dilution,application_method,dwell_time,follow_up,warnings,verification_status,source_note,active,use_role,risk_level,approval_required,hse_status,sds_url,sds_language,hse_verified_at)
values
('Koch-Chemie','Reactive Rust Remover','exterior',array['paint','glass','wheels'],array['hot_surface','unverified_sensitive_finish'],
 'Ready to use; do not dilute.',
 'Spray on a cool surface; allow 3–6 minutes; do not let dry; rinse thoroughly.',
 '3–6 min',
 'Rinse thoroughly; wash again if needed.',
 'Test polished aluminium and other sensitive finishes first. Do not use hot or allow to dry.',
 'manufacturer_verified','https://www.koch-chemie.com/en/products/reactive_rust_remover',true,'specialist','caution',false,
 'source_reviewed','https://www.koch-chemie.com/en/products/reactive_rust_remover','no',date '2026-09-23'),

('Koch-Chemie','Top Star','interior',array['interior_plastic','interior_rubber'],array['display','polycarbonate','steering_wheel','pedals'],
 'Ready to use; do not dilute.',
 'Shake; spray onto a soft sponge/applicator, not directly onto electronics; apply evenly.',
 null,
 'Allow to dry; remove excess with microfiber if needed.',
 'Do not use on displays/polycarbonate or surfaces where slipperiness is hazardous.',
 'manufacturer_verified','https://www.koch-chemie.com/en/products/top_star',true,'general','caution',false,
 'source_reviewed','https://www.koch-chemie.com/en/products/top_star','no',date '2026-09-23'),

('CARPRO','Essence Plus','exterior',array['paint','coated_paint'],array['deep_defect_repair'],
 'Ready to use; do not dilute.',
 'Apply by soft foam applicator or machine according to manufacturer guidance after full surface preparation.',
 'Minimum 30 min before final wipe per verified working instruction.',
 'Remove residue with clean microfiber.',
 'Not a deep scratch repair product. Surface preparation is mandatory.',
 'manufacturer_verified','https://carpro.global/product/essenceplus/',true,'specialist','high_risk',true,
 'source_reviewed','https://carpro.global/product/essenceplus/','no',date '2026-09-23'),

('TASKI','Tapi Extract C1b','interior',array['textile','carpet','upholstery'],array['unknown_colourfastness'],
 'Pre-spray 5–10%; direct extraction method 2%. Choose one method.',
 'Pre-spray with low-pressure sprayer then extract with clean water, OR use 2% in extractor tank.',
 '5–10 min for pre-spray; do not let dry.',
 'Additional extraction-only passes and complete drying.',
 'Professional use. Test colour/material compatibility and avoid overwetting.',
 'manufacturer_verified','https://products.solenis.com/no/product/taski-tapi-extract-c1b-2x5l-101100322',true,'general','caution',false,
 'verified','https://sdslibrary.solenis.com/BlobDownload/FetchFiles?filename=SDS/000000000101100322-NO-NO.PDF','no',date '2026-09-23'),

('Autoglym','Polar Blast','exterior',array['paint','glass','wheels'],array['hot_surface'],
 'Starting mix 1:5 in foam-gun bottle; adjust up to 1:10 depending on equipment/foam.',
 'Apply through pressure-washer foam gun on cool surface; do not agitate during normal prewash; rinse thoroughly.',
 'Up to 10 min; never allow to dry.',
 'Rinse completely before contact wash.',
 'Do not use in a bucket. Avoid hot surfaces/direct sun and drying.',
 'manufacturer_verified','https://www.autoglym.com/no/pb002-5-polar-blast-nordno.html',true,'general','high_risk',true,
 'source_reviewed','https://www.autoglym.com/no/pb002-5-polar-blast-nordno.html','no',date '2026-09-23'),

('Gtechniq','W4 Citrus Foam — legacy red bottle','exterior',array['paint'],array['professional_auto_use_until_exact_sds'],
 'Legacy bottle dosage verified from label; professional automatic use blocked until exact matching legacy SDS is obtained.',
 'HMS quarantine: do not auto-select for professional customer work.',
 null,
 'Keep original labelled bottle; use only after exact SDS verification.',
 'Legacy formulation. Current W4 SDS may refer to a different formulation.',
 'source_reviewed','https://gtechniq.com/snow-foam-yay-or-nay/',true,'specialist','stop',true,
 'stop','https://gtechniq.com/shop/auto/wash-decon-polish/w4-citrus-foam/','en',date '2026-09-23'),

('Autoglym','Polar Wash','exterior',array['paint','glass','wheels'],array['soft_top'],
 'Do not mix stronger than 50:50 product:water in compatible foaming equipment.',
 'Apply through pressure-washer foaming attachment, then perform contact wash with clean mitt/sponge.',
 null,
 'Rinse thoroughly and dry.',
 'Do not use as ordinary bucket shampoo; avoid hot surface/direct sun; do not let dry.',
 'manufacturer_verified','https://www.autoglym.com/vp3pc-polar-collection.html',true,'general','high_risk',true,
 'source_reviewed','https://www.autoglym.com/vp3pc-polar-collection.html','no',date '2026-09-23'),

('Turtle Wax','Scratch Repair & Renew','exterior',array['paint'],array['deep_scratch_through_paint'],
 'Ready to use; do not dilute.',
 'Apply by microfiber/polishing applicator; work only on clean, cool paint.',
 null,
 'Wipe clean and inspect; repeat only as needed.',
 'Does not repair scratches through clearcoat/paint. Avoid direct sun.',
 'source_reviewed','https://www.turtlewax.com/products/scratch-repair-renew-7-oz',true,'specialist','caution',false,
 'source_reviewed','https://turtlewax.no/bilpleie-eksterior/turtle-wax-scratch-repair-renew/','no',date '2026-09-23')
on conflict (brand,name) do nothing;
