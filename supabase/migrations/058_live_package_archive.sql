-- Let admins archive a past-month live subscription package so it can no longer be
-- purchased (older students no longer need it, and the list grows every month). Archiving
-- only hides it from purchase — existing subscribers keep their access.

alter table public.subscription_packages
  add column if not exists is_archived boolean not null default false;
