-- Configurable billing time (hour of day, Mauritius time UTC+4) for recurring billing.
-- Combined with billing_day, billing runs on that day at this hour, e.g. 15th @ 10:00.
alter table public.site_settings
  add column if not exists billing_hour int not null default 6;

comment on column public.site_settings.billing_hour is 'Hour (0-23, Mauritius time UTC+4) at which recurring billing runs on billing_day';
