-- Attendance open flag on live classes; admin toggles per class
alter table public.live_classes
  add column if not exists attendance_open boolean not null default false;
