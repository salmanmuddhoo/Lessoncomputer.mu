-- Display prices in USD for visitors outside Mauritius. This stores the admin-set
-- exchange rate as MUR per 1 USD (e.g. 46 => 1 USD = 46 MUR; USD price = MUR / 46).
-- NULL / 0 = disabled (everyone keeps seeing Mauritian Rupees). Charging is unchanged
-- (MIPS still settles in MUR); this only affects the displayed currency.

alter table public.site_settings
  add column if not exists usd_rate numeric;

comment on column public.site_settings.usd_rate is
  'MUR per 1 USD, used to DISPLAY prices in USD for non-Mauritius visitors. NULL/0 = show MUR only. Payment is still charged in MUR.';
