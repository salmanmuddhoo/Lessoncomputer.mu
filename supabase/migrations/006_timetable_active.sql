-- Add is_active flag to profiles (for student deactivation)
alter table public.profiles
  add column is_active boolean not null default true;

-- Timetable entries per grade
create table public.timetables (
  id          uuid primary key default uuid_generate_v4(),
  grade_id    uuid not null references public.grades(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=Mon … 6=Sun
  subject     text not null,
  start_time  time not null,
  end_time    time not null,
  teacher     text,
  notes       text,
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);

create index idx_timetables_grade_id on public.timetables(grade_id);
create index idx_timetables_day     on public.timetables(grade_id, day_of_week, start_time);

alter table public.timetables enable row level security;

create policy "Timetables are publicly readable"
  on public.timetables for select using (true);

create policy "Admins can manage timetables"
  on public.timetables for all
  using (public.is_admin());
