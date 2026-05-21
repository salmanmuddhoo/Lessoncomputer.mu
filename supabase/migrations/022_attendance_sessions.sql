-- Admin-opened attendance windows for live classes
create table if not exists public.attendance_sessions (
  id         uuid primary key default gen_random_uuid(),
  grade_id   uuid not null references public.grades(id) on delete cascade,
  label      text,
  opened_by  uuid references auth.users(id) on delete set null,
  opens_at   timestamptz not null default now(),
  closes_at  timestamptz not null,
  created_at timestamptz not null default now()
);

create index on public.attendance_sessions(grade_id);
create index on public.attendance_sessions(closes_at);

-- Student marks (one per student per session)
create table if not exists public.attendance_marks (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  marked_at  timestamptz not null default now(),
  constraint uq_attendance_mark unique(session_id, student_id)
);

create index on public.attendance_marks(session_id);
create index on public.attendance_marks(student_id);

alter table public.attendance_sessions enable row level security;
alter table public.attendance_marks enable row level security;

-- Admin full access
create policy "admin_all_attendance_sessions" on public.attendance_sessions
  for all using (is_admin()) with check (is_admin());

create policy "admin_all_attendance_marks" on public.attendance_marks
  for all using (is_admin()) with check (is_admin());

-- Students can read sessions (to check if one is open for their grade)
create policy "student_read_sessions" on public.attendance_sessions
  for select to authenticated using (true);

-- Students can insert their own mark only while the window is open
create policy "student_insert_mark" on public.attendance_marks
  for insert to authenticated
  with check (
    auth.uid() = student_id
    and exists (
      select 1 from public.attendance_sessions s
      where s.id = session_id
        and now() between s.opens_at and s.closes_at
    )
  );

-- Students can read their own marks
create policy "student_read_own_marks" on public.attendance_marks
  for select to authenticated using (auth.uid() = student_id);
