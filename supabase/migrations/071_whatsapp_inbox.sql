-- Two-way WhatsApp inbox. A parent messaging the business number lands here so an admin
-- can see and reply to it from the platform (mirrors contact_messages/contact_message_replies,
-- but keyed by phone number since inbound WhatsApp senders aren't authenticated app users).
--
-- Inserts always go through the webhook route (inbound) or the admin reply route (outbound),
-- both using the service role — RLS here only governs admin reads/updates.

create table if not exists public.whatsapp_conversations (
  id                  uuid primary key default gen_random_uuid(),
  phone               text not null unique,  -- normalized digits (normalizeWhatsAppDigits)
  contact_name        text,                  -- Meta contact profile name, best-effort
  student_id          uuid references public.profiles(id) on delete set null, -- resolved via parent_phone, best-effort
  last_message_at     timestamptz not null default now(),
  last_message_preview text,
  unread_count        int not null default 0, -- unread by admin
  created_at          timestamptz not null default now()
);

create index if not exists whatsapp_conversations_last_message_idx
  on public.whatsapp_conversations(last_message_at desc);

alter table public.whatsapp_conversations enable row level security;
drop policy if exists "Admins manage whatsapp conversations" on public.whatsapp_conversations;
create policy "Admins manage whatsapp conversations"
  on public.whatsapp_conversations for all
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.whatsapp_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  direction       text not null check (direction in ('in', 'out')),
  wa_message_id   text,          -- Meta's message id (inbound dedup / outbound receipts)
  body            text not null,
  status          text,          -- outbound delivery status: sent|delivered|read|failed
  sender_admin_id uuid references public.profiles(id) on delete set null, -- who sent (outbound only)
  created_at      timestamptz not null default now()
);

create unique index if not exists whatsapp_messages_wa_message_id_key
  on public.whatsapp_messages(wa_message_id) where wa_message_id is not null;
create index if not exists whatsapp_messages_thread_idx
  on public.whatsapp_messages(conversation_id, created_at);

alter table public.whatsapp_messages enable row level security;
drop policy if exists "Admins manage whatsapp messages" on public.whatsapp_messages;
create policy "Admins manage whatsapp messages"
  on public.whatsapp_messages for all
  using (public.is_admin())
  with check (public.is_admin());
