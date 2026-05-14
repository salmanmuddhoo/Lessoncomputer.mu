-- Migration 009: Link live classes to subscription packages
alter table public.live_classes
  add column if not exists package_id uuid references public.subscription_packages(id) on delete set null;
