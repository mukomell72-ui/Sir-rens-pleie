alter table public.orders add column if not exists payment_status text not null default 'unpaid';
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists referral_discount numeric(10,2) not null default 0;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='orders_payment_status_check') then
    alter table public.orders add constraint orders_payment_status_check check(payment_status in ('unpaid','paid','refunded'));
  end if;
  if not exists (select 1 from pg_constraint where conname='orders_referral_discount_check') then
    alter table public.orders add constraint orders_referral_discount_check check(referral_discount>=0);
  end if;
end $$;

create unique index if not exists referrals_order_unique on public.referrals(order_id) where order_id is not null;
create index if not exists referrals_referrer_idx on public.referrals(referrer_customer_id,status);

create or replace function private.prepare_referral() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  v_code text; v_referrer uuid; v_cfg jsonb; v_min numeric; v_discount numeric;
begin
  new.referral_discount:=0;
  v_code:=upper(trim(coalesce(new.referral_code_used,'')));
  if v_code='' or new.customer_id is null then
    new.referral_code_used:=null;
    return new;
  end if;

  select id into v_referrer from public.customers where upper(referral_code)=v_code limit 1;
  if v_referrer is null or v_referrer=new.customer_id then
    new.referral_code_used:=null;
    return new;
  end if;

  if exists(select 1 from public.orders o where o.customer_id=new.customer_id) then
    new.referral_code_used:=null;
    return new;
  end if;

  select value into v_cfg from public.app_settings where key='referral';
  v_min:=coalesce((v_cfg->>'minimum_order')::numeric,750);
  v_discount:=coalesce((v_cfg->>'new_customer_discount')::numeric,100);

  if new.preliminary_price is null or greatest(new.preliminary_price-coalesce(new.travel_fee,0),0)<v_min then
    new.referral_code_used:=null;
    return new;
  end if;

  new.referral_code_used:=v_code;
  new.referral_discount:=least(v_discount,new.preliminary_price);
  new.preliminary_price:=new.preliminary_price-new.referral_discount;
  return new;
end $$;
revoke all on function private.prepare_referral() from public;

drop trigger if exists sir_prepare_referral on public.orders;
create trigger sir_prepare_referral before insert on public.orders for each row execute function private.prepare_referral();

create or replace function private.create_referral_record() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  v_referrer uuid; v_cfg jsonb; v_credit numeric; v_discount numeric;
begin
  if new.referral_code_used is null or new.referral_discount<=0 then return new; end if;
  select id into v_referrer from public.customers where upper(referral_code)=upper(new.referral_code_used) limit 1;
  if v_referrer is null or v_referrer=new.customer_id then return new; end if;
  select value into v_cfg from public.app_settings where key='referral';
  v_credit:=coalesce((v_cfg->>'referrer_credit')::numeric,200);
  v_discount:=new.referral_discount;
  insert into public.referrals(referrer_customer_id,referred_customer_id,order_id,referral_code,referrer_credit,new_customer_discount,status)
  values(v_referrer,new.customer_id,new.id,new.referral_code_used,v_credit,v_discount,'pending')
  on conflict(order_id) where order_id is not null do nothing;
  return new;
end $$;
revoke all on function private.create_referral_record() from public;

drop trigger if exists sir_create_referral_record on public.orders;
create trigger sir_create_referral_record after insert on public.orders for each row execute function private.create_referral_record();

create or replace function private.award_referral_credit() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  v_referral public.referrals;
begin
  if new.payment_status='paid' and old.payment_status is distinct from 'paid' then
    new.paid_at:=coalesce(new.paid_at,now());
  elsif new.payment_status<>'paid' then
    new.paid_at:=null;
  end if;
  return new;
end $$;
revoke all on function private.award_referral_credit() from public;

drop trigger if exists sir_set_paid_at on public.orders;
create trigger sir_set_paid_at before update on public.orders for each row execute function private.award_referral_credit();

create or replace function private.credit_referrer_after_payment() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  v_referrer uuid; v_credit numeric; v_referral_id uuid;
begin
  if new.status='completed' and new.payment_status='paid' and not (old.status='completed' and old.payment_status='paid') then
    select id,referrer_customer_id,referrer_credit into v_referral_id,v_referrer,v_credit
    from public.referrals where order_id=new.id and status='pending' for update;
    if v_referral_id is not null then
      update public.customers set credit_balance=credit_balance+v_credit,updated_at=now() where id=v_referrer;
      update public.referrals set status='credited',credited_at=now() where id=v_referral_id;
      insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
      values(auth.uid(),'referral_credit_awarded','order',new.id::text,jsonb_build_object('customer_id',v_referrer,'credit',v_credit));
    end if;
  end if;
  return new;
end $$;
revoke all on function private.credit_referrer_after_payment() from public;

drop trigger if exists sir_credit_referrer_after_payment on public.orders;
create trigger sir_credit_referrer_after_payment after update on public.orders for each row execute function private.credit_referrer_after_payment();
