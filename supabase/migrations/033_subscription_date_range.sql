-- Add date-range columns to student_subscriptions
-- valid_from: first day access is granted (NULL = always active, used for video packages)
-- valid_until: last day access is active (NULL = never expires)
ALTER TABLE public.student_subscriptions
  ADD COLUMN IF NOT EXISTS valid_from  date,
  ADD COLUMN IF NOT EXISTS valid_until date;

COMMENT ON COLUMN public.student_subscriptions.valid_from  IS '1st of subscription month for live packages; NULL for video packages (no expiry)';
COMMENT ON COLUMN public.student_subscriptions.valid_until IS 'Last day of subscription month for live packages; NULL for video packages (no expiry)';
