-- Per-admin access to the Finance and Payments sections. Not every admin should see revenue
-- and payment data. Existing admins keep access (they had it before this change); new admins
-- get access only when explicitly granted at creation by an admin who already has it.

alter table public.profiles
  add column if not exists can_access_finance boolean not null default false;

update public.profiles set can_access_finance = true where role = 'admin';

-- Extend the privilege-escalation guard so NOBODY can change can_access_finance from the
-- client — not even an admin (which would let a restricted admin self-grant access). Only
-- service-role server code (the admin-management routes, which verify the caller already has
-- finance access) may set it.
create or replace function public.prevent_profile_privilege_escalation()
returns trigger as $$
begin
  -- Service role bypasses RLS entirely and is trusted server code.
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- Finance access is service-role-only, so a restricted admin cannot self-grant it.
  if new.can_access_finance is distinct from old.can_access_finance then
    raise exception 'Not authorised to change finance access';
  end if;

  -- Admins may change the other privileged columns (e.g. suspend a student, grant admin).
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
