-- Ad-tracking data captured at checkout (fbp/fbc/ip/ua/referer) and a sent-once guard for the
-- server-side Meta Conversions API Purchase event — see docs/TRACKING.md Step 4. Written only
-- by the service role (students have no UPDATE policy on mips_orders).

alter table public.mips_orders
  add column if not exists tracking jsonb,
  add column if not exists meta_capi_sent_at timestamptz;
