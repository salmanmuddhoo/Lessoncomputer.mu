-- student_subscriptions was missing updated_at, but the billing cron, payment
-- callback, and cancel/restore routes all set `updated_at` on update. PostgREST
-- rejected those updates (unknown column) and they failed silently — e.g. previous
-- months' is_recurring flag never got cleared. Add the column so those updates work.
alter table public.student_subscriptions
  add column if not exists updated_at timestamptz not null default now();
