-- Parent contact: student must provide parent phone before joining live classes.
-- WhatsApp group invite is sent automatically via Meta Cloud API on first submission.

alter table public.profiles
  add column if not exists parent_phone            text,
  add column if not exists parent_whatsapp_sent_at timestamptz;

-- Allow students to update their own parent_phone
create policy "Students update own parent phone"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admin-configurable WhatsApp group invite URL
alter table public.site_settings
  add column if not exists whatsapp_group_url text;
