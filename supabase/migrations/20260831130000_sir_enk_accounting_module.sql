-- SIR ENK / bookkeeping module.
-- Internal bookkeeping support only; official filing remains in Skatteetaten/approved accounting software.

create table if not exists public.accounting_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  kind text not null check (kind in ('expense','manual_income')),
  category text not null,
  description text not null,
  counterparty_name text,
  counterparty_org_no text,
  document_no text,
  amount_gross numeric(12,2) not null check (amount_gross >= 0),
  vat_rate numeric(5,2) not null default 0 check (vat_rate >= 0 and vat_rate <= 100),
  deductible_percent numeric(5,2) not null default 100 check (deductible_percent >= 0 and deductible_percent <= 100),
  payment_method text not null default 'bank' check (payment_method in ('bank','card','cash','vipps','other')),
  order_id uuid references public.orders(id) on delete set null,
  receipt_path text,
  notes text,
  voided_at timestamptz,
  void_reason text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_mileage (
  id uuid primary key default gen_random_uuid(),
  trip_date date not null default current_date,
  vehicle_plate text not null,
  start_place text not null,
  end_place text not null,
  purpose text not null,
  kilometers numeric(10,1) not null check (kilometers > 0 and kilometers <= 2000),
  order_id uuid references public.orders(id) on delete set null,
  notes text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_assets (
  id uuid primary key default gen_random_uuid(),
  purchase_date date not null default current_date,
  name text not null,
  supplier text,
  document_no text,
  purchase_price numeric(12,2) not null check (purchase_price >= 0),
  vat_rate numeric(5,2) not null default 0 check (vat_rate >= 0 and vat_rate <= 100),
  business_use_percent numeric(5,2) not null default 100 check (business_use_percent >= 0 and business_use_percent <= 100),
  expected_use_years numeric(5,1) check (expected_use_years is null or expected_use_years > 0),
  depreciation_start_date date,
  receipt_path text,
  notes text,
  disposed_at date,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no bigint not null unique,
  kind text not null default 'sale' check (kind in ('sale','credit')),
  order_id uuid references public.orders(id) on delete restrict,
  credit_for uuid references public.accounting_invoices(id) on delete restrict,
  invoice_date date not null,
  due_date date not null,
  delivery_date date not null,
  delivery_place text not null,
  seller_name text not null,
  seller_org_no text not null,
  seller_address text not null,
  seller_mva_registered boolean not null default false,
  buyer_name text not null,
  buyer_address text,
  buyer_org_no text,
  description text not null,
  amount_net numeric(12,2) not null,
  vat_rate numeric(5,2) not null default 0 check (vat_rate >= 0 and vat_rate <= 100),
  vat_amount numeric(12,2) not null,
  amount_gross numeric(12,2) not null,
  payment_method text check (payment_method is null or payment_method in ('bank','card','cash','vipps','other')),
  status text not null default 'issued' check (status in ('issued','paid','credited')),
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  notes text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounting_invoice_sign check (
    (kind='sale' and amount_net >= 0 and vat_amount >= 0 and amount_gross >= 0)
    or
    (kind='credit' and amount_net <= 0 and vat_amount <= 0 and amount_gross <= 0)
  )
);

create unique index if not exists accounting_one_sale_invoice_per_order
  on public.accounting_invoices(order_id) where kind='sale' and order_id is not null;
create index if not exists accounting_entries_date_idx on public.accounting_entries(entry_date desc);
create index if not exists accounting_entries_order_idx on public.accounting_entries(order_id);
create index if not exists accounting_mileage_date_idx on public.accounting_mileage(trip_date desc);
create index if not exists accounting_assets_purchase_idx on public.accounting_assets(purchase_date desc);
create index if not exists accounting_invoices_date_idx on public.accounting_invoices(invoice_date desc);
create index if not exists accounting_invoices_order_idx on public.accounting_invoices(order_id);

create table if not exists private.accounting_counters (
  key text primary key,
  last_value bigint not null default 0,
  updated_at timestamptz not null default now()
);
insert into private.accounting_counters(key,last_value)
values ('invoice',0)
on conflict (key) do nothing;
revoke all on private.accounting_counters from public, anon, authenticated;

drop trigger if exists accounting_entries_touch on public.accounting_entries;
create trigger accounting_entries_touch before update on public.accounting_entries
for each row execute function private.touch_updated_at();
drop trigger if exists accounting_mileage_touch on public.accounting_mileage;
create trigger accounting_mileage_touch before update on public.accounting_mileage
for each row execute function private.touch_updated_at();
drop trigger if exists accounting_assets_touch on public.accounting_assets;
create trigger accounting_assets_touch before update on public.accounting_assets
for each row execute function private.touch_updated_at();
drop trigger if exists accounting_invoices_touch on public.accounting_invoices;
create trigger accounting_invoices_touch before update on public.accounting_invoices
for each row execute function private.touch_updated_at();

create or replace function private.protect_accounting_invoice()
returns trigger
language plpgsql
set search_path='public'
as $$
begin
  if old.invoice_no is distinct from new.invoice_no
     or old.kind is distinct from new.kind
     or old.order_id is distinct from new.order_id
     or old.credit_for is distinct from new.credit_for
     or old.invoice_date is distinct from new.invoice_date
     or old.delivery_date is distinct from new.delivery_date
     or old.delivery_place is distinct from new.delivery_place
     or old.seller_name is distinct from new.seller_name
     or old.seller_org_no is distinct from new.seller_org_no
     or old.seller_address is distinct from new.seller_address
     or old.seller_mva_registered is distinct from new.seller_mva_registered
     or old.buyer_name is distinct from new.buyer_name
     or old.buyer_address is distinct from new.buyer_address
     or old.buyer_org_no is distinct from new.buyer_org_no
     or old.description is distinct from new.description
     or old.amount_net is distinct from new.amount_net
     or old.vat_rate is distinct from new.vat_rate
     or old.vat_amount is distinct from new.vat_amount
     or old.amount_gross is distinct from new.amount_gross
     or old.issued_at is distinct from new.issued_at
     or old.created_by is distinct from new.created_by
     or old.created_at is distinct from new.created_at
  then
    raise exception 'issued invoice content is immutable; use a credit note for corrections';
  end if;

  if old.status='credited' and new.status is distinct from old.status then
    raise exception 'credited invoice status is immutable';
  end if;
  if old.status='paid' and new.status not in ('paid','credited') then
    raise exception 'paid invoice can only remain paid or be credited';
  end if;
  if old.status='issued' and new.status not in ('issued','paid','credited') then
    raise exception 'invalid invoice status transition';
  end if;

  return new;
end $$;

drop trigger if exists accounting_invoice_protect on public.accounting_invoices;
create trigger accounting_invoice_protect before update on public.accounting_invoices
for each row execute function private.protect_accounting_invoice();

alter table public.accounting_entries enable row level security;
alter table public.accounting_mileage enable row level security;
alter table public.accounting_assets enable row level security;
alter table public.accounting_invoices enable row level security;

drop policy if exists accounting_entries_admin on public.accounting_entries;
create policy accounting_entries_admin on public.accounting_entries
for all to authenticated
using (private.is_staff(array['owner','admin']))
with check (private.is_staff(array['owner','admin']));

drop policy if exists accounting_mileage_admin on public.accounting_mileage;
create policy accounting_mileage_admin on public.accounting_mileage
for all to authenticated
using (private.is_staff(array['owner','admin']))
with check (private.is_staff(array['owner','admin']));

drop policy if exists accounting_assets_admin on public.accounting_assets;
create policy accounting_assets_admin on public.accounting_assets
for all to authenticated
using (private.is_staff(array['owner','admin']))
with check (private.is_staff(array['owner','admin']));

drop policy if exists accounting_invoices_read on public.accounting_invoices;
create policy accounting_invoices_read on public.accounting_invoices
for select to authenticated
using (private.is_staff(array['owner','admin']));
drop policy if exists accounting_invoices_update on public.accounting_invoices;
create policy accounting_invoices_update on public.accounting_invoices
for update to authenticated
using (private.is_staff(array['owner','admin']))
with check (private.is_staff(array['owner','admin']));

revoke all on public.accounting_entries, public.accounting_mileage, public.accounting_assets, public.accounting_invoices from anon;
grant select,insert,update on public.accounting_entries, public.accounting_mileage, public.accounting_assets to authenticated;
grant select,update on public.accounting_invoices to authenticated;

insert into public.app_settings(key,value,description)
values (
  'accounting',
  jsonb_build_object(
    'legal_name','',
    'org_no','',
    'address','',
    'mva_registered',false,
    'mva_registration_date',null,
    'default_vat_rate',25,
    'prices_include_vat',true,
    'payment_terms_days',14,
    'bank_account','',
    'tax_reserve_percent',35,
    'document_retention_years',5,
    'asset_capitalization_threshold',30000,
    'default_vehicle_plate','BR92992'
  ),
  'ENK/regnskap: company identity, VAT and bookkeeping defaults'
)
on conflict (key) do nothing;

drop policy if exists settings_read on public.app_settings;
create policy settings_read on public.app_settings
for select to authenticated
using (
  private.is_staff()
  and (key <> 'accounting' or private.is_staff(array['owner','admin']))
);

-- Keep accounting settings private to signed-in staff.
drop policy if exists settings_public_read on public.app_settings;
create policy settings_public_read on public.app_settings
for select to anon
using (key = any(array['company','travel','referral']));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values (
  'accounting-documents',
  'accounting-documents',
  false,
  15728640,
  array['application/pdf','image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists accounting_docs_select on storage.objects;
create policy accounting_docs_select on storage.objects
for select to authenticated
using (bucket_id='accounting-documents' and private.is_staff(array['owner','admin']));
drop policy if exists accounting_docs_insert on storage.objects;
create policy accounting_docs_insert on storage.objects
for insert to authenticated
with check (bucket_id='accounting-documents' and private.is_staff(array['owner','admin']));
drop policy if exists accounting_docs_update on storage.objects;
create policy accounting_docs_update on storage.objects
for update to authenticated
using (bucket_id='accounting-documents' and private.is_staff(array['owner','admin']))
with check (bucket_id='accounting-documents' and private.is_staff(array['owner','admin']));

create or replace function public.create_accounting_invoice_from_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path='public','private'
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders;
  v_settings jsonb;
  v_no bigint;
  v_terms integer;
  v_vat_rate numeric(5,2);
  v_registered boolean;
  v_include_vat boolean;
  v_gross numeric(12,2);
  v_net numeric(12,2);
  v_vat numeric(12,2);
  v_invoice public.accounting_invoices;
  v_existing public.accounting_invoices;
  v_description text;
  v_legal_name text;
  v_org_no text;
  v_address text;
begin
  if v_uid is null or not private.is_staff(array['owner','admin']) then
    raise exception 'owner/admin access required';
  end if;

  select * into v_existing
  from public.accounting_invoices
  where order_id=p_order_id and kind='sale'
  limit 1;
  if v_existing.id is not null then
    return to_jsonb(v_existing);
  end if;

  select * into v_order from public.orders where id=p_order_id;
  if v_order.id is null then raise exception 'order not found'; end if;
  if v_order.status <> 'completed' then raise exception 'order must be completed before invoicing'; end if;

  select value into v_settings from public.app_settings where key='accounting';
  v_legal_name := trim(coalesce(v_settings->>'legal_name',''));
  v_org_no := regexp_replace(coalesce(v_settings->>'org_no',''),'[^0-9]','','g');
  v_address := trim(coalesce(v_settings->>'address',''));
  if v_legal_name='' or length(v_org_no)<>9 or v_address='' then
    raise exception 'complete legal name, 9-digit organisation number and business address in ENK settings first';
  end if;

  v_terms := greatest(0, least(90, coalesce((v_settings->>'payment_terms_days')::integer,14)));
  v_registered := coalesce((v_settings->>'mva_registered')::boolean,false);
  v_vat_rate := case when v_registered then coalesce((v_settings->>'default_vat_rate')::numeric,25) else 0 end;
  if v_vat_rate < 0 or v_vat_rate > 100 then raise exception 'invalid VAT rate'; end if;
  v_include_vat := coalesce((v_settings->>'prices_include_vat')::boolean,true);
  v_gross := round(coalesce(v_order.final_price,v_order.preliminary_price,0)::numeric,2);
  if v_gross <= 0 then raise exception 'order has no invoiceable amount'; end if;

  if v_vat_rate > 0 and not v_include_vat then
    v_net := v_gross;
    v_vat := round(v_net * v_vat_rate / 100,2);
    v_gross := v_net + v_vat;
  elsif v_vat_rate > 0 then
    v_net := round(v_gross / (1 + v_vat_rate/100),2);
    v_vat := v_gross - v_net;
  else
    v_net := v_gross;
    v_vat := 0;
  end if;

  update private.accounting_counters
     set last_value=last_value+1,updated_at=now()
   where key='invoice'
   returning last_value into v_no;
  if v_no is null then raise exception 'invoice counter unavailable'; end if;

  v_description := case v_order.service_type
    when 'car' then 'Rens av bilinteriør'
    when 'sofa' then 'Rens av sofa'
    when 'chair' then 'Rens av stol/lenestol'
    when 'mattress' then 'Rens av madrass'
    else 'Rens og pleie – '||coalesce(v_order.service_type,'tjeneste')
  end;

  insert into public.accounting_invoices(
    invoice_no,kind,order_id,invoice_date,due_date,delivery_date,delivery_place,
    seller_name,seller_org_no,seller_address,seller_mva_registered,
    buyer_name,buyer_address,description,amount_net,vat_rate,vat_amount,amount_gross,
    created_by,notes
  )
  values(
    v_no,'sale',v_order.id,current_date,current_date+v_terms,
    coalesce(v_order.completed_at::date,current_date),
    coalesce(nullif(trim(v_order.address),''),coalesce(v_settings->>'address','Kongsberg')),
    v_legal_name,v_org_no,v_address,v_registered,
    v_order.customer_name,v_order.address,v_description,
    v_net,v_vat_rate,v_vat,v_gross,v_uid,'Order '||v_order.order_no
  )
  returning * into v_invoice;

  return to_jsonb(v_invoice);
end $$;

create or replace function public.create_accounting_credit_note(p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path='public','private'
as $$
declare
  v_uid uuid := auth.uid();
  v_original public.accounting_invoices;
  v_credit public.accounting_invoices;
  v_no bigint;
begin
  if v_uid is null or not private.is_staff(array['owner','admin']) then
    raise exception 'owner/admin access required';
  end if;
  select * into v_original from public.accounting_invoices where id=p_invoice_id for update;
  if v_original.id is null then raise exception 'invoice not found'; end if;
  if v_original.kind <> 'sale' then raise exception 'only sale invoices can be credited'; end if;
  if v_original.status='credited' then raise exception 'invoice already credited'; end if;

  update private.accounting_counters
     set last_value=last_value+1,updated_at=now()
   where key='invoice'
   returning last_value into v_no;

  insert into public.accounting_invoices(
    invoice_no,kind,order_id,credit_for,invoice_date,due_date,delivery_date,delivery_place,
    seller_name,seller_org_no,seller_address,seller_mva_registered,
    buyer_name,buyer_address,buyer_org_no,description,
    amount_net,vat_rate,vat_amount,amount_gross,status,created_by,notes
  )
  values(
    v_no,'credit',v_original.order_id,v_original.id,current_date,current_date,
    v_original.delivery_date,v_original.delivery_place,
    v_original.seller_name,v_original.seller_org_no,v_original.seller_address,v_original.seller_mva_registered,
    v_original.buyer_name,v_original.buyer_address,v_original.buyer_org_no,
    'Kreditnota for faktura '||v_original.invoice_no||': '||v_original.description,
    -v_original.amount_net,v_original.vat_rate,-v_original.vat_amount,-v_original.amount_gross,
    'issued',v_uid,'Credit note for invoice '||v_original.invoice_no
  )
  returning * into v_credit;

  update public.accounting_invoices set status='credited' where id=v_original.id;
  return to_jsonb(v_credit);
end $$;

create or replace function public.set_accounting_invoice_paid(p_invoice_id uuid, p_paid boolean, p_method text default null)
returns jsonb
language plpgsql
security definer
set search_path='public','private'
as $$
declare
  v_uid uuid := auth.uid();
  v_invoice public.accounting_invoices;
  v_method text := nullif(trim(coalesce(p_method,'')),'');
begin
  if v_uid is null or not private.is_staff(array['owner','admin']) then
    raise exception 'owner/admin access required';
  end if;
  if v_method is not null and v_method not in ('bank','card','cash','vipps','other') then
    raise exception 'invalid payment method';
  end if;

  select * into v_invoice from public.accounting_invoices where id=p_invoice_id for update;
  if v_invoice.id is null then raise exception 'invoice not found'; end if;
  if v_invoice.kind <> 'sale' then raise exception 'credit notes are not payment targets'; end if;
  if v_invoice.status='credited' then raise exception 'credited invoice cannot be marked paid'; end if;

  update public.accounting_invoices
     set status=case when p_paid then 'paid' else 'issued' end,
         paid_at=case when p_paid then coalesce(paid_at,now()) else null end,
         payment_method=coalesce(v_method,payment_method)
   where id=p_invoice_id
   returning * into v_invoice;

  if v_invoice.order_id is not null then
    update public.orders
       set payment_status=case when p_paid then 'paid' else 'unpaid' end,
           paid_at=case when p_paid then coalesce(paid_at,now()) else null end
     where id=v_invoice.order_id;
  end if;

  return to_jsonb(v_invoice);
end $$;

revoke all on function public.create_accounting_invoice_from_order(uuid) from public, anon;
revoke all on function public.create_accounting_credit_note(uuid) from public, anon;
revoke all on function public.set_accounting_invoice_paid(uuid,boolean,text) from public, anon;
grant execute on function public.create_accounting_invoice_from_order(uuid) to authenticated;
grant execute on function public.create_accounting_credit_note(uuid) to authenticated;
grant execute on function public.set_accounting_invoice_paid(uuid,boolean,text) to authenticated;
