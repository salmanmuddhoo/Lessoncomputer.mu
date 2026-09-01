-- Inbound messages from the public /contact form. Distinct from `broadcasts` (admin→student)
-- and `admin_notifications` (system-generated) — these are visitor/student→admin messages.
-- student_id/grade_id are captured at submission time when the sender is logged in, so admins
-- can tell which student (and grade) a message came from.

create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  subject     text not null,
  body        text not null,
  student_id  uuid references public.profiles(id) on delete set null,
  grade_id    uuid references public.grades(id) on delete set null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists contact_messages_created_at_idx on public.contact_messages(created_at desc);

alter table public.contact_messages enable row level security;

-- Admin-only. Rows are inserted server-side with the service role (which bypasses RLS) from
-- the /api/contact route; this policy governs admin reads/updates (e.g. marking as read).
drop policy if exists "Admins manage contact messages" on public.contact_messages;
create policy "Admins manage contact messages"
  on public.contact_messages for all
  using (public.is_admin())
  with check (public.is_admin());
