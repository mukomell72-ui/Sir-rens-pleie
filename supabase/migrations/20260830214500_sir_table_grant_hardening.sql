-- RLS is the row-level boundary, but TRUNCATE/DDL-adjacent privileges are not
-- appropriate for browser roles. Keep browser table grants at least privilege.

revoke all privileges on table
  public.profiles,
  public.customers,
  public.orders,
  public.appointments,
  public.order_events,
  public.audit_events,
  public.referrals,
  public.chemicals,
  public.procedures,
  public.order_technology_cards,
  public.order_photos,
  public.order_items
from anon;

revoke all privileges on table public.app_settings, public.price_rules from anon;
grant select on table public.app_settings, public.price_rules to anon;

revoke truncate, references, trigger on table
  public.profiles,
  public.customers,
  public.orders,
  public.appointments,
  public.order_events,
  public.audit_events,
  public.app_settings,
  public.price_rules,
  public.referrals,
  public.chemicals,
  public.procedures,
  public.order_technology_cards,
  public.order_photos,
  public.order_items
from authenticated;

-- Authenticated staff still need normal CRUD privileges; RLS decides which rows
-- and which roles may actually perform each operation.
grant select, insert, update, delete on table
  public.profiles,
  public.customers,
  public.orders,
  public.appointments,
  public.order_events,
  public.audit_events,
  public.app_settings,
  public.price_rules,
  public.referrals,
  public.chemicals,
  public.procedures,
  public.order_technology_cards,
  public.order_photos,
  public.order_items
to authenticated;
