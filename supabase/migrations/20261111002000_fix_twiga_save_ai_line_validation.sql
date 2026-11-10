-- Fix the E.164 validator used by the business AI settings page.
-- The previous over-escaped plus regex rejected valid international numbers.
create or replace function public.save_ai_line(p_business uuid, p_number text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  n text;
begin
  if not exists (
    select 1 from public.business_members m
    where m.business_id = p_business
      and m.user_id = auth.uid()
      and m.role in ('owner','admin','manager')
  ) then
    raise exception 'Not allowed';
  end if;

  n := public.norm_number(p_number);
  if left(n, 1) <> '+' or substring(n from 2) !~ '^[0-9]{7,14}$' then
    raise exception 'Enter the number with its country code, like +254712345678';
  end if;

  delete from public.ai_lines where business_id = p_business;
  insert into public.ai_lines(number, business_id)
  values (n, p_business)
  on conflict (number) do update
    set business_id = excluded.business_id
    where public.ai_lines.business_id = p_business;

  if not exists (
    select 1 from public.ai_lines
    where number = n and business_id = p_business
  ) then
    raise exception 'That number is already used by another business';
  end if;
end
$function$;
