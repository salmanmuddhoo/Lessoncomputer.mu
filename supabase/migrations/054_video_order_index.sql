-- Let admins control the display order of videos within a chapter. Videos previously had no
-- order column and were shown by created_at, which admins couldn't control. Add an
-- order_index and seed it from the existing created_at order so nothing jumps around.

alter table public.videos
  add column if not exists order_index integer not null default 0;

-- Seed order_index per (grade, chapter) using the current created_at order (0-based).
update public.videos v
set order_index = s.rn
from (
  select id,
         row_number() over (
           partition by grade_id, coalesce(chapter_id::text, 'none')
           order by created_at asc
         ) - 1 as rn
  from public.videos
) s
where v.id = s.id;

create index if not exists idx_videos_chapter_order on public.videos(chapter_id, order_index);
