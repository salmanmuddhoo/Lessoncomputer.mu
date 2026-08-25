-- Capture the student's country/region at signup (from the request IP, via Vercel geo
-- headers) for the marketing report. Populated server-side in the auth callback; never
-- overwritten once set.

alter table public.profiles
  add column if not exists signup_country text,
  add column if not exists signup_region  text;
