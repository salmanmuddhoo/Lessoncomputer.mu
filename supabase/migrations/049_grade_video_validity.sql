-- Video packages were permanent (no expiry). Add a per-grade validity window (in weeks)
-- for VIDEO subscriptions: when a student buys a grade's video package they get access
-- for this many weeks, after which it expires and must be re-purchased.
--
-- NULL = unlimited (unchanged behaviour). Live subscriptions are unaffected.

alter table public.grades
  add column if not exists video_validity_weeks integer;

comment on column public.grades.video_validity_weeks is
  'Weeks a purchased video package stays valid for this grade. NULL = unlimited. Live subs unaffected.';
