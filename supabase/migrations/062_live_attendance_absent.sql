-- Let admins explicitly mark a student ABSENT for a live class (distinct from "joined but
-- didn't mark present"). Present = scheduled_end_time set & not absent; Absent = is_absent
-- true; otherwise the student joined only.

alter table public.live_attendance
  add column if not exists is_absent boolean not null default false;
