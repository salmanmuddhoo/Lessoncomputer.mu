-- Admin notifications: system-generated messages shown to admins on the Messages page
-- (e.g. "Student John of grade 7 has cancelled his recurring monthly subscription for July").
-- Distinct from `broadcasts`, which are admin→student messages.

create table if not exists public.admin_notifications (
  id          uuid primary key default gen_random_uuid(),
  type        text not null default 'info',
  message     text not null,
  student_id  uuid references public.profiles(id) on delete set null,
  grade_id    uuid references public.grades(id) on delete set null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists admin_notifications_created_at_idx on public.admin_notifications(created_at desc);

alter table public.admin_notifications enable row level security;

-- Admin-only. Rows are inserted server-side with the service role (which bypasses RLS);
-- this policy governs admin reads/updates (e.g. marking as read) from their session.
drop policy if exists "Admins manage notifications" on public.admin_notifications;
create policy "Admins manage notifications"
  on public.admin_notifications for all
  using (public.is_admin())
  with check (public.is_admin());
