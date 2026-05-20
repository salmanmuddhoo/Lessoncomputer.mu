-- Fix live_attendance RLS: replace broad FOR ALL policy with explicit per-operation
-- policies so that Supabase upsert (INSERT ... ON CONFLICT DO UPDATE) works correctly.

drop policy if exists "Students manage own attendance" on public.live_attendance;

create policy "Students insert own attendance"
  on public.live_attendance
  for insert
  to authenticated
  with check (auth.uid() = student_id);

create policy "Students update own attendance"
  on public.live_attendance
  for update
  to authenticated
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

create policy "Students read own attendance"
  on public.live_attendance
  for select
  to authenticated
  using (auth.uid() = student_id);
