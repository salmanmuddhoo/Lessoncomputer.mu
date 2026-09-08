-- A recurring live class is ONE row in live_classes but happens every week. The old unique
-- constraint on (live_class_id, student_id) meant only ONE attendance record could ever exist
-- per student for the whole recurring series — marking present in week 2 either overwrote or
-- (via ignoreDuplicates on join) silently no-opped over week 1's record, so all but the latest
-- week's attendance was lost. Add occurrence_date so each week gets its own record.

alter table public.live_attendance
  add column if not exists occurrence_date date;

-- Backfill existing rows (each was a single-occurrence record) from their own entry_time,
-- read in Mauritius local time so the date matches what admins/students actually saw.
update public.live_attendance
  set occurrence_date = (entry_time at time zone 'Indian/Mauritius')::date
  where occurrence_date is null;

alter table public.live_attendance
  alter column occurrence_date set not null,
  alter column occurrence_date set default ((now() at time zone 'Indian/Mauritius')::date);

alter table public.live_attendance drop constraint if exists uq_live_attendance;
alter table public.live_attendance
  add constraint uq_live_attendance unique (live_class_id, student_id, occurrence_date);

create index if not exists live_attendance_occurrence_idx on public.live_attendance(live_class_id, occurrence_date);
