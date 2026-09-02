create table if not exists public.order_assessments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  version integer not null, assessment_type text not null check (assessment_type in ('remote','on_site')),
  condition_score integer not null check (condition_score between 1 and 10), observed_condition text not null,
  hidden_findings text, confirmed_material text,
  risk_level text not null default 'caution' check (risk_level in ('low','caution','high_risk','stop')),
  estimated_minutes integer not null check (estimated_minutes between 15 and 1440),
  proposed_price numeric(10,2) not null check (proposed_price between 0 and 100000), price_change_reason text,
  work_steps jsonb not null default '[]'::jsonb, chemistry_plan jsonb not null default '[]'::jsonb,
  moisture_plan text, pass_and_drying_plan text, stop_conditions jsonb not null default '[]'::jsonb,
  client_visible boolean not null default false,
  reviewed_by uuid not null references public.profiles(id) on delete restrict,
  reviewed_at timestamptz not null default now(), created_at timestamptz not null default now(),
  unique(order_id,version)
);
create index if not exists order_assessments_order_version_idx on public.order_assessments(order_id,version desc);
create index if not exists order_assessments_reviewed_by_idx on public.order_assessments(reviewed_by);
alter table public.order_assessments enable row level security;
create policy order_assessments_select on public.order_assessments for select to authenticated using(private.is_staff());
create policy order_assessments_insert on public.order_assessments for insert to authenticated
  with check(private.is_staff(array['owner','admin','manager']) and reviewed_by=(select auth.uid()));
create policy order_assessments_update on public.order_assessments for update to authenticated
  using(private.is_staff(array['owner','admin','manager'])) with check(private.is_staff(array['owner','admin','manager']));
grant select,insert,update on public.order_assessments to authenticated;

create or replace function public.save_order_assessment(p_order uuid,p_assessment jsonb) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare v_version integer; v_visible boolean:=coalesce((p_assessment->>'client_visible')::boolean,false);
begin
  if not private.is_staff(array['owner','admin','manager']) then raise exception 'not allowed'; end if;
  select coalesce(max(version),0)+1 into v_version from public.order_assessments where order_id=p_order;
  insert into public.order_assessments(order_id,version,assessment_type,condition_score,observed_condition,
    hidden_findings,confirmed_material,risk_level,estimated_minutes,proposed_price,price_change_reason,
    work_steps,chemistry_plan,moisture_plan,pass_and_drying_plan,stop_conditions,client_visible,reviewed_by)
  values(p_order,v_version,p_assessment->>'assessment_type',(p_assessment->>'condition_score')::integer,
    p_assessment->>'observed_condition',nullif(p_assessment->>'hidden_findings',''),p_assessment->>'confirmed_material',
    p_assessment->>'risk_level',(p_assessment->>'estimated_minutes')::integer,(p_assessment->>'proposed_price')::numeric,
    p_assessment->>'price_change_reason',coalesce(p_assessment->'work_steps','[]'::jsonb),
    coalesce(p_assessment->'chemistry_plan','[]'::jsonb),p_assessment->>'moisture_plan',
    p_assessment->>'pass_and_drying_plan',coalesce(p_assessment->'stop_conditions','[]'::jsonb),v_visible,(select auth.uid()));
  update public.orders set estimated_minutes=(p_assessment->>'estimated_minutes')::integer,
    risk_level=p_assessment->>'risk_level',
    final_price=case when v_visible then (p_assessment->>'proposed_price')::numeric else final_price end,
    internal_note='Осмотр v'||v_version||': '||coalesce(nullif(p_assessment->>'hidden_findings',''),'скрытых факторов нет')
  where id=p_order;
  return jsonb_build_object('version',v_version,'client_visible',v_visible);
end $$;
revoke all on function public.save_order_assessment(uuid,jsonb) from public,anon;
grant execute on function public.save_order_assessment(uuid,jsonb) to authenticated;

alter table public.order_photos add column if not exists phase text not null default 'customer'
  check (phase in ('customer','on_site_before','during','after'));
alter table public.order_photos add column if not exists assessment_id uuid references public.order_assessments(id) on delete set null;
create index if not exists order_photos_assessment_id_idx on public.order_photos(assessment_id);

create or replace function public.public_get_offer(p_order_no text,p_token text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_order public.orders; v_appt public.appointments; v_assessment public.order_assessments;
begin
  select * into v_order from public.orders where order_no=p_order_no
    and confirmation_token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and confirmation_expires_at>now();
  if v_order.id is null then raise exception 'invalid or expired offer'; end if;
  select * into v_appt from public.appointments where order_id=v_order.id order by starts_at desc limit 1;
  select * into v_assessment from public.order_assessments
    where order_id=v_order.id and client_visible=true order by version desc limit 1;
  return jsonb_build_object(
    'order_no',v_order.order_no,'status',v_order.status,'service_type',v_order.service_type,
    'final_price',v_order.final_price,'estimated_minutes',v_order.estimated_minutes,
    'starts_at',v_appt.starts_at,'ends_at',v_appt.ends_at,'location_mode',v_appt.location_mode,
    'address',coalesce(v_appt.address,v_order.address),'assessment_version',v_assessment.version,
    'assessment_type',v_assessment.assessment_type,'price_change_reason',v_assessment.price_change_reason);
end $$;
revoke all on function public.public_get_offer(text,text) from public;
grant execute on function public.public_get_offer(text,text) to anon;
