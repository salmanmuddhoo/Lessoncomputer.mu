-- SECURITY (P0): the "Users can update own profile" / "Students update own parent
-- phone" RLS policies authorize a self-update with only `auth.uid() = id` and no
-- column restriction, so a student could set their own `role` to 'admin' straight
-- from the browser with the anon key. RLS WITH CHECK cannot compare against the OLD
-- row, so we guard the privileged columns with a BEFORE UPDATE trigger instead.
--
-- Service-role writes (server-side admin actions, the auth-callback backfill) and
-- genuine admin users are allowed through untouched; only ordinary authenticated
-- users are prevented from changing role / is_active on any profile.

create or replace function public.prevent_profile_privilege_escalation()
returns trigger as $$
begin
  -- Service role bypasses RLS entirely and is trusted server code.
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- Admins may change privileged columns (e.g. suspend a student, grant admin).
  if public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Not authorised to change role';
  end if;

  if new.is_active is distinct from old.is_active then
    raise exception 'Not authorised to change account status';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists profiles_prevent_privilege_escalation on public.profiles;
create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();
