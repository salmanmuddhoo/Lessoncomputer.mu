-- Add chapter_id to broadcasts for chapter-based message grouping
alter table public.broadcasts
  add column if not exists chapter_id uuid references public.chapters(id) on delete set null;
