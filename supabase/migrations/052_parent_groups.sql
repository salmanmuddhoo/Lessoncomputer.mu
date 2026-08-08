-- Parent WhatsApp groups, scoped per grade AND academic year (a new student batch
-- enrolls each year, so "Grade 9 — 2026" is a distinct cohort from "Grade 9 — 2027").
--
-- Design note: the official WhatsApp Cloud API cannot create groups, add members, or
-- post to a group. So a "group" here is (a) an optional real WhatsApp group whose INVITE
-- LINK we store and auto-send to each new parent, and (b) a cohort membership list that
-- powers admin 1-to-1 broadcasts and individual student reports. Membership is captured
-- at enrolment time and preserved historically, so past cohorts stay addressable.

-- Admin-set current academic year (drives which cohort a newly-enrolling parent joins).
alter table public.site_settings
  add column if not exists current_academic_year int;
update public.site_settings
  set current_academic_year = extract(year from now())::int
  where current_academic_year is null;

-- One cohort per (grade, year).
create table if not exists public.parent_groups (
  id                 uuid primary key default gen_random_uuid(),
  grade_id           uuid not null references public.grades(id) on delete cascade,
  academic_year      int  not null,
  name               text,
  whatsapp_group_url text,               -- invite link to the real WhatsApp group (optional)
  created_at         timestamptz not null default now(),
  unique (grade_id, academic_year)
);

alter table public.parent_groups enable row level security;
create policy "Admins manage parent_groups" on public.parent_groups
  for all using (public.is_admin()) with check (public.is_admin());

-- A parent's membership in a cohort. parent_phone is snapshotted so a later profile edit
-- (or the student leaving) does not lose the historical recipient list.
create table if not exists public.parent_group_members (
  id              uuid primary key default gen_random_uuid(),
  parent_group_id uuid not null references public.parent_groups(id) on delete cascade,
  student_id      uuid not null references public.profiles(id) on delete cascade,
  parent_phone    text,
  invite_sent_at  timestamptz,
  created_at      timestamptz not null default now(),
  unique (parent_group_id, student_id)
);

alter table public.parent_group_members enable row level security;
create policy "Admins manage parent_group_members" on public.parent_group_members
  for all using (public.is_admin()) with check (public.is_admin());

create index if not exists parent_group_members_group_idx on public.parent_group_members(parent_group_id);
create index if not exists parent_group_members_student_idx on public.parent_group_members(student_id);
create index if not exists parent_groups_grade_year_idx on public.parent_groups(grade_id, academic_year);
