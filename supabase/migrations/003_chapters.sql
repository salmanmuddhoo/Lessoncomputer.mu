-- Add chapters support to LessonComputer.mu
-- Chapters belong to a grade and group videos

create table public.chapters (
  id          uuid primary key default uuid_generate_v4(),
  grade_id    uuid not null references public.grades(id) on delete cascade,
  title       text not null,
  description text,
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);

create index idx_chapters_grade_id on public.chapters(grade_id);
create index idx_chapters_order    on public.chapters(grade_id, order_index);

-- Attach chapter_id to videos (nullable — videos may exist outside a chapter)
alter table public.videos
  add column chapter_id uuid references public.chapters(id) on delete set null;

create index idx_videos_chapter_id on public.videos(chapter_id);

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.chapters enable row level security;

create policy "Chapters are publicly readable"
  on public.chapters for select using (true);

create policy "Admins can manage chapters"
  on public.chapters for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));
