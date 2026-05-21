-- Revision notes: HTML content for video packages and live classes
create table if not exists public.revision_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,                         -- HTML for video package subscribers
  content_live text,                    -- HTML for live class subscribers
  grade_id uuid not null references public.grades(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete set null,
  is_published boolean not null default false,
  is_published_for_live boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.revision_notes enable row level security;

-- Admins: full access
create policy "admin_all_revision_notes" on public.revision_notes
  for all using (is_admin()) with check (is_admin());

-- Students: read published notes for their grade
create policy "student_read_revision_notes" on public.revision_notes
  for select using (is_published = true or is_published_for_live = true);
