-- Live class attendance tracking
create table if not exists public.live_attendance (
  id                  uuid primary key default gen_random_uuid(),
  live_class_id       uuid not null references public.live_classes(id) on delete cascade,
  student_id          uuid not null references auth.users(id) on delete cascade,
  grade_id            uuid not null references public.grades(id) on delete cascade,
  entry_time          timestamptz not null,
  scheduled_end_time  timestamptz,
  created_at          timestamptz not null default now(),
  constraint uq_live_attendance unique(live_class_id, student_id)
);

create index on public.live_attendance(grade_id);
create index on public.live_attendance(student_id);
create index on public.live_attendance(live_class_id);

alter table public.live_attendance enable row level security;

-- Admins have full access
create policy "Admins manage live attendance"
  on public.live_attendance
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Students can insert and update their own attendance records
create policy "Students manage own attendance"
  on public.live_attendance
  for all
  to authenticated
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);
