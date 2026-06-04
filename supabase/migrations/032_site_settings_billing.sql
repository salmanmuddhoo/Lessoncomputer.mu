-- Add billing configuration to site_settings
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS billing_day  int NOT NULL DEFAULT 28,
  ADD COLUMN IF NOT EXISTS cutoff_day   int NOT NULL DEFAULT 20;

COMMENT ON COLUMN public.site_settings.billing_day IS 'Day of month on which recurring payments are charged (default 28)';
COMMENT ON COLUMN public.site_settings.cutoff_day  IS 'Last day students can enrol in the current month (default 20); after this, purchase is for next month';
