update public.app_settings
set value = jsonb_set(value, '{enk_registered}', 'false'::jsonb, true),
    updated_at = now()
where key = 'accounting' and not (value ? 'enk_registered');

create or replace function private.require_enk_registration_for_sale_invoice()
returns trigger
language plpgsql
security definer
set search_path='public','private'
as $$
declare
  v_settings jsonb;
begin
  if new.kind = 'sale' then
    select value into v_settings from public.app_settings where key='accounting';
    if not coalesce((v_settings->>'enk_registered')::boolean,false) then
      raise exception 'ENK is not registered yet; official invoice issuance is disabled';
    end if;
  end if;
  return new;
end $$;

revoke all on function private.require_enk_registration_for_sale_invoice() from public, anon, authenticated;

drop trigger if exists accounting_invoice_require_enk on public.accounting_invoices;
create trigger accounting_invoice_require_enk
before insert on public.accounting_invoices
for each row execute function private.require_enk_registration_for_sale_invoice();