-- Public TWIGA demo requests. Visitors can submit via a narrowly scoped RPC;
-- anonymous clients cannot read or directly mutate the table.
create extension if not exists pgcrypto;

create table if not exists public.twiga_demo_bookings (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  business_name text not null check (char_length(trim(business_name)) between 2 and 120),
  phone text not null check (phone ~ '^254[17][0-9]{8}$'),
  email text not null check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  preferred_time text not null default 'Weekday morning',
  status text not null default 'new' check (status in ('new','contacted','scheduled','completed','cancelled')),
  source text not null default 'twiga.co.ke',
  request_fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists twiga_demo_bookings_created_idx
  on public.twiga_demo_bookings(created_at desc);
create index if not exists twiga_demo_bookings_status_idx
  on public.twiga_demo_bookings(status, created_at desc);
create index if not exists twiga_demo_bookings_email_idx
  on public.twiga_demo_bookings(lower(email), created_at desc);

alter table public.twiga_demo_bookings enable row level security;
revoke all on public.twiga_demo_bookings from anon, authenticated;

create or replace function public.twiga_create_demo_booking(
  p_full_name text,
  p_business_name text,
  p_phone text,
  p_email text,
  p_preferred_time text default 'Weekday morning',
  p_fingerprint text default null,
  p_honeypot text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_phone text := regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g');
  v_email text := lower(trim(coalesce(p_email,'')));
  v_name text := trim(coalesce(p_full_name,''));
  v_business text := trim(coalesce(p_business_name,''));
  v_fingerprint text := nullif(trim(coalesce(p_fingerprint,'')), '');
begin
  -- Quietly accept honeypot submissions without storing them.
  if nullif(trim(coalesce(p_honeypot,'')), '') is not null then
    return jsonb_build_object('ok', true, 'booking_id', null);
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 100
     or char_length(v_business) < 2 or char_length(v_business) > 120
     or v_phone !~ '^254[17][0-9]{8}$'
     or v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
     or char_length(coalesce(p_preferred_time,'')) > 80 then
    raise exception 'Please check the booking details and try again.';
  end if;

  if (select count(*) from public.twiga_demo_bookings
      where created_at > now() - interval '1 hour'
        and (lower(email) = v_email or phone = v_phone)) >= 3 then
    raise exception 'Too many requests for these contact details. Please try again later.';
  end if;

  if v_fingerprint is not null and
     (select count(*) from public.twiga_demo_bookings
      where created_at > now() - interval '1 hour'
        and request_fingerprint = v_fingerprint) >= 5 then
    raise exception 'Too many demo requests from this connection. Please try again later.';
  end if;

  insert into public.twiga_demo_bookings
    (full_name, business_name, phone, email, preferred_time, request_fingerprint)
  values
    (v_name, v_business, v_phone, v_email,
     left(coalesce(nullif(trim(p_preferred_time),''),'Weekday morning'),80),
     v_fingerprint)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'booking_id', v_id);
end;
$$;

revoke all on function public.twiga_create_demo_booking(text,text,text,text,text,text,text) from public;
grant execute on function public.twiga_create_demo_booking(text,text,text,text,text,text,text) to anon, authenticated;
