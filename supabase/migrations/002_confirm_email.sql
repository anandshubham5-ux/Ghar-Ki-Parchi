-- Login is by emailed code, so receiving the code already proves the email.
-- Called only by the prepare-login function (service_role), never from the website.
create function public.confirm_email(p_email text) returns void
language sql security definer set search_path = '' as $$
  update auth.users
     set email_confirmed_at = now(), updated_at = now()
   where lower(email) = lower(trim(p_email))
     and email_confirmed_at is null;
$$;
revoke execute on function public.confirm_email(text) from public, anon, authenticated;
grant execute on function public.confirm_email(text) to service_role;
