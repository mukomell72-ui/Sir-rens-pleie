update public.chemicals
set hse_status='source_reviewed'
where brand='TASKI'
  and name='Tapi Extract C1b'
  and (hse_hazards is null or hse_ppe is null or hse_first_aid is null or hse_storage is null);
