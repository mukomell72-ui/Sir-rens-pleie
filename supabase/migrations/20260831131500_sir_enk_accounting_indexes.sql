create index if not exists accounting_entries_created_by_idx on public.accounting_entries(created_by);
create index if not exists accounting_mileage_order_idx on public.accounting_mileage(order_id);
create index if not exists accounting_mileage_created_by_idx on public.accounting_mileage(created_by);
create index if not exists accounting_assets_created_by_idx on public.accounting_assets(created_by);
create index if not exists accounting_invoices_credit_for_idx on public.accounting_invoices(credit_for);
create index if not exists accounting_invoices_created_by_idx on public.accounting_invoices(created_by);
