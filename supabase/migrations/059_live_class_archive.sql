-- Archiving a month's live subscription package also archives that month's live class(es).
-- Live classes have no package_id link (it's always null) — they correlate to a month package
-- by grade_id + the month/year of scheduled_at. Add an is_archived flag and hide archived
-- classes from the public catalogue view (which the marketing pages and student attendance read).

alter table public.live_classes
  add column if not exists is_archived boolean not null default false;

-- Recreate the catalogue view to also exclude archived classes (mirrors 051, plus the filter).
drop view if exists public.live_classes_catalogue;
create view public.live_classes_catalogue
  with (security_invoker = false) as
  select lc.id, lc.title, lc.description, lc.grade_id, lc.scheduled_at, lc.price,
         lc.is_subscription_only, lc.max_students, lc.is_published, lc.package_id,
         lc.is_recurring, lc.recurrence_day_of_week, lc.end_time, lc.attendance_open,
         lc.created_at,
         g.name  as grade_name,
         g.color as grade_color,
         g.slug  as grade_slug
  from public.live_classes lc
  left join public.grades g on g.id = lc.grade_id
  where lc.is_published = true
    and lc.is_archived = false;
grant select on public.live_classes_catalogue to anon, authenticated;
