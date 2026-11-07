-- Make demo requests concrete: visitors choose a requested date and time.
alter table public.twiga_demo_bookings
  add column if not exists preferred_date date;

drop function if exists public.twiga_create_demo_booking(text,text,text,text,text,text,text);

create or replace function public.twiga_create_demo_booking(
  p_full_name text,
  p_business_name text,
  p_phone text,
  p_email text,
  p_preferred_date date,
  p_preferred_time text,
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
  v_time text := trim(coalesce(p_preferred_time,''));
begin
  if nullif(trim(coalesce(p_honeypot,'')), '') is not null then
    return jsonb_build_object('ok', true, 'booking_id', null);
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 100
     or char_length(v_business) < 2 or char_length(v_business) > 120
     or v_phone !~ '^254[17][0-9]{8}$'
     or v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
     or p_preferred_date is null
     or p_preferred_date < current_date
     or p_preferred_date > current_date + 90
     or v_time not in ('09:00','10:30','12:00','14:00','15:30') then
    raise exception 'Please check the booking details and choose a valid demo date and time.';
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
    (full_name, business_name, phone, email, preferred_date, preferred_time, request_fingerprint)
  values
    (v_name, v_business, v_phone, v_email, p_preferred_date, v_time, v_fingerprint)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'booking_id', v_id);
end;
$$;

revoke all on function public.twiga_create_demo_booking(text,text,text,text,date,text,text,text) from public;
grant execute on function public.twiga_create_demo_booking(text,text,text,text,date,text,text,text) to anon, authenticated;
