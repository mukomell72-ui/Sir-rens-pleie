update public.chemicals
set name='W4 Citrus Foam',
    technology_note=trim(both from concat_ws(' ', nullif(technology_note,''), 'Legacy red bottle. Exact matching legacy SDS not verified; keep HMS=stop and risk=stop until the matching SDS/formulation is confirmed.')),
    updated_at=now()
where brand='Gtechniq'
  and name='W4 Citrus Foam — legacy red bottle';
