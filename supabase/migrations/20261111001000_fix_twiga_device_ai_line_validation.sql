-- Ensure E.164 AI bridge numbers are validated without an over-escaped plus regex.
-- This is required for the Android SIM conference bridge to save a Retell/Vapi line.
create or replace function public.device_save_line(p_token text, p_number text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  d public.devices;
  n text;
begin
  d := public.dev_by_token(p_token);
  if d.id is null then
    raise exception 'Unknown device';
  end if;

  n := public.norm_number(p_number);
  if left(n, 1) <> '+' or substring(n from 2) !~ '^[0-9]{7,14}$' then
    raise exception 'Enter the number with its country code';
  end if;

  delete from public.ai_lines where business_id = d.business_id;
  insert into public.ai_lines(number, business_id)
  values (n, d.business_id)
  on conflict (number) do update
    set business_id = excluded.business_id
    where public.ai_lines.business_id = d.business_id;
end
$function$;
