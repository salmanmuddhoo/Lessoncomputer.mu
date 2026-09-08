-- Registered business address, shown on the Contact page instead of just "Mauritius".
alter table public.site_settings
  add column if not exists business_address text;
