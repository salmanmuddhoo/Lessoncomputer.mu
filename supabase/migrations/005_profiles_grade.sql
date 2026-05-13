-- Add grade_id to profiles so students can be associated with a grade
alter table public.profiles
  add column grade_id uuid references public.grades(id) on delete set null;

create index idx_profiles_grade_id on public.profiles(grade_id);
