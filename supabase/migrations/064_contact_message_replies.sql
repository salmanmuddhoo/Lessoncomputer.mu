-- Two-way replies on a contact_messages thread. A thread starts either from the public
-- /contact form or from a student's dashboard ("Messages" > Contact Admin); both sides can
-- reply within it. `is_read` on a reply means "read by the recipient" (the OTHER party from
-- sender_role) — an admin reading a student's reply, or a student reading an admin's reply.
--
-- Inserts always go through a server route (service role) so the sender/role can be verified
-- against the session; RLS here only governs each party's own reads.

create table if not exists public.contact_message_replies (
  id                  uuid primary key default gen_random_uuid(),
  contact_message_id  uuid not null references public.contact_messages(id) on delete cascade,
  sender_role         text not null check (sender_role in ('admin', 'student')),
  sender_id           uuid references public.profiles(id) on delete set null,
  body                text not null,
  is_read             boolean not null default false,
  created_at          timestamptz not null default now()
);

create index if not exists contact_message_replies_thread_idx on public.contact_message_replies(contact_message_id, created_at);

alter table public.contact_message_replies enable row level security;

drop policy if exists "Admins manage contact message replies" on public.contact_message_replies;
create policy "Admins manage contact message replies"
  on public.contact_message_replies for all
  using (public.is_admin())
  with check (public.is_admin());

-- A student may read replies on a thread that belongs to them.
drop policy if exists "Students read own thread replies" on public.contact_message_replies;
create policy "Students read own thread replies"
  on public.contact_message_replies for select
  using (
    exists (
      select 1 from public.contact_messages cm
      where cm.id = contact_message_replies.contact_message_id
        and cm.student_id = auth.uid()
    )
  );

-- A student may mark an admin's reply on their own thread as read (opening it in the UI).
drop policy if exists "Students mark admin replies read" on public.contact_message_replies;
create policy "Students mark admin replies read"
  on public.contact_message_replies for update
  using (
    sender_role = 'admin'
    and exists (
      select 1 from public.contact_messages cm
      where cm.id = contact_message_replies.contact_message_id
        and cm.student_id = auth.uid()
    )
  )
  with check (
    sender_role = 'admin'
    and exists (
      select 1 from public.contact_messages cm
      where cm.id = contact_message_replies.contact_message_id
        and cm.student_id = auth.uid()
    )
  );

-- A student may also read their own contact_messages threads (previously admin-only).
drop policy if exists "Students read own contact messages" on public.contact_messages;
create policy "Students read own contact messages"
  on public.contact_messages for select
  using (student_id = auth.uid());
