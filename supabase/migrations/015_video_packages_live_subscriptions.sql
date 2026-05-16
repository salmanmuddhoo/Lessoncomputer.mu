-- Video packages: make month/year optional (kept for live_month type)
alter table public.subscription_packages alter column month drop not null;
alter table public.subscription_packages alter column year drop not null;

-- Distinguish video packages from live-month folders
alter table public.subscription_packages
  add column if not exists package_type text not null default 'video'
  check (package_type in ('video', 'live_month'));

-- Optional access expiry for video packages (days; null = no expiry)
alter table public.subscription_packages
  add column if not exists expires_days integer;

-- Live class subscription settings per grade
alter table public.grades
  add column if not exists live_subscription_price numeric not null default 0;
alter table public.grades
  add column if not exists live_subscription_enabled boolean not null default false;

-- student_subscriptions: support both video-package and live-class subscriptions
alter table public.student_subscriptions
  add column if not exists subscription_type text not null default 'video'
  check (subscription_type in ('video', 'live'));
alter table public.student_subscriptions alter column package_id drop not null;
alter table public.student_subscriptions
  add column if not exists grade_id uuid references public.grades(id);

-- Chapter visibility for live-class subscribers
alter table public.chapters
  add column if not exists is_visible_to_subscribers boolean not null default false;
