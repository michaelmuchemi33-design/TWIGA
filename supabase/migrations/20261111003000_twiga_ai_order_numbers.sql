-- Human-readable, sequential order numbers for AI-captured phone orders.
create table if not exists public.twiga_order_counters (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  next_number bigint not null default 1
);

alter table public.twiga_orders
  add column if not exists order_number text,
  add column if not exists customer_phone text,
  add column if not exists source_call_id text,
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists currency text not null default 'KES',
  add column if not exists payment_status text not null default 'unpaid';

with numbered as (
  select id, row_number() over (partition by business_id order by created_at, id) as rn
  from public.twiga_orders
  where order_number is null or btrim(order_number) = ''
)
update public.twiga_orders o
set order_number = 'ORD-' || lpad(numbered.rn::text, 6, '0')
from numbered
where o.id = numbered.id;

create or replace function public.twiga_next_order_number(p_business_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_number bigint;
begin
  insert into public.twiga_order_counters(business_id, next_number)
  values (p_business_id, 2)
  on conflict (business_id) do update
    set next_number = public.twiga_order_counters.next_number + 1
  returning next_number - 1 into v_number;
  return 'ORD-' || lpad(v_number::text, 6, '0');
end
$function$;

insert into public.twiga_order_counters(business_id, next_number)
select business_id, count(*) + 1 from public.twiga_orders group by business_id
on conflict (business_id) do update
  set next_number = greatest(public.twiga_order_counters.next_number, excluded.next_number);

create or replace function public.twiga_orders_assign_number()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.order_number is null or btrim(new.order_number) = '' then
    new.order_number := public.twiga_next_order_number(new.business_id);
  end if;
  return new;
end
$function$;

drop trigger if exists twiga_orders_assign_number_before_insert on public.twiga_orders;
create trigger twiga_orders_assign_number_before_insert
before insert on public.twiga_orders
for each row execute function public.twiga_orders_assign_number();

create unique index if not exists twiga_orders_business_order_number_uq
  on public.twiga_orders(business_id, order_number);
create unique index if not exists twiga_orders_business_source_call_uq
  on public.twiga_orders(business_id, source_call_id) where source_call_id is not null;

revoke all on public.twiga_order_counters from anon, authenticated;
revoke all on function public.twiga_next_order_number(uuid) from public, anon, authenticated;
revoke all on function public.twiga_orders_assign_number() from public, anon, authenticated;
