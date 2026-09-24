alter table public.orders
  add column if not exists customer_credit_applied numeric(10,2) not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.orders'::regclass
      and conname='orders_customer_credit_applied_check'
  ) then
    alter table public.orders
      add constraint orders_customer_credit_applied_check
      check (customer_credit_applied >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.referrals'::regclass
      and conname='referrals_status_check'
  ) then
    alter table public.referrals
      add constraint referrals_status_check
      check (status in ('pending','credited'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.referrals'::regclass
      and conname='referrals_amounts_nonnegative_check'
  ) then
    alter table public.referrals
      add constraint referrals_amounts_nonnegative_check
      check (referrer_credit >= 0 and new_customer_discount >= 0);
  end if;
end $$;

create or replace function public.apply_customer_credit(
  p_order_id uuid,
  p_amount numeric
)
returns jsonb
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_order public.orders;
  v_customer public.customers;
  v_old_applied numeric;
  v_base_price numeric;
  v_available numeric;
  v_new_amount numeric;
begin
  if auth.uid() is null or not private.is_staff(array['owner','admin','manager']) then
    raise exception 'owner/admin/manager access required';
  end if;

  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'order not found'; end if;
  if v_order.customer_id is null then raise exception 'order has no linked customer'; end if;
  if v_order.payment_status in ('paid','refunded') then
    raise exception 'credit cannot be changed after payment/refund';
  end if;
  if exists(select 1 from public.accounting_invoices i where i.order_id=p_order_id and i.kind='sale') then
    raise exception 'credit cannot be changed after invoice creation';
  end if;

  select * into v_customer from public.customers where id=v_order.customer_id for update;
  if not found then raise exception 'customer not found'; end if;

  v_old_applied:=coalesce(v_order.customer_credit_applied,0);
  v_base_price:=coalesce(v_order.final_price,0)+v_old_applied;
  if v_base_price<=0 then raise exception 'final price required before applying credit'; end if;

  v_available:=coalesce(v_customer.credit_balance,0)+v_old_applied;
  v_new_amount:=round(greatest(0,coalesce(p_amount,0))::numeric,2);
  if v_new_amount>v_available then raise exception 'credit amount exceeds customer balance'; end if;
  if v_new_amount>v_base_price then raise exception 'credit amount exceeds final price'; end if;

  update public.customers
  set credit_balance=v_available-v_new_amount,updated_at=now()
  where id=v_customer.id;

  update public.orders
  set customer_credit_applied=v_new_amount,final_price=v_base_price-v_new_amount
  where id=p_order_id
  returning * into v_order;

  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'customer_credit_applied','order',p_order_id::text,
    jsonb_build_object('customer_id',v_customer.id,'old_amount',v_old_applied,'new_amount',v_new_amount,'remaining_balance',v_available-v_new_amount,'final_price',v_order.final_price));

  return jsonb_build_object('order_id',p_order_id,'customer_credit_applied',v_order.customer_credit_applied,'final_price',v_order.final_price,'remaining_balance',v_available-v_new_amount);
end $$;

revoke all on function public.apply_customer_credit(uuid,numeric) from public, anon;
grant execute on function public.apply_customer_credit(uuid,numeric) to authenticated;

create or replace function private.restore_customer_credit_on_refund()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_status='refunded'
     and old.payment_status is distinct from 'refunded'
     and coalesce(old.customer_credit_applied,0)>0
     and old.customer_id is not null then
    update public.customers
    set credit_balance=credit_balance+old.customer_credit_applied,updated_at=now()
    where id=old.customer_id;

    new.final_price:=coalesce(new.final_price,old.final_price,0)+old.customer_credit_applied;
    new.customer_credit_applied:=0;

    insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'customer_credit_restored_on_refund','order',old.id::text,
      jsonb_build_object('customer_id',old.customer_id,'amount',old.customer_credit_applied));
  end if;
  return new;
end $$;

drop trigger if exists sir_restore_customer_credit_on_refund on public.orders;
create trigger sir_restore_customer_credit_on_refund
before update on public.orders
for each row execute function private.restore_customer_credit_on_refund();
