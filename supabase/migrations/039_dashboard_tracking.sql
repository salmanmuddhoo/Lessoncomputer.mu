-- Dashboard tracking: video watch progress + message read state.

-- A video counts as "watched" once the student opens it (the Streamable iframe
-- gives no playback events, so open = watched). Drives the completion % widget.
create table if not exists public.video_progress (
  student_id uuid not null references auth.users(id) on delete cascade,
  video_id   uuid not null references public.videos(id) on delete cascade,
  watched_at timestamptz not null default now(),
  primary key (student_id, video_id)
);
alter table public.video_progress enable row level security;
create policy "Students manage own video progress"
  on public.video_progress for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- Which broadcasts a student has read — powers the unread-message notification.
create table if not exists public.broadcast_reads (
  student_id   uuid not null references auth.users(id) on delete cascade,
  broadcast_id uuid not null references public.broadcasts(id) on delete cascade,
  read_at      timestamptz not null default now(),
  primary key (student_id, broadcast_id)
);
alter table public.broadcast_reads enable row level security;
create policy "Students manage own broadcast reads"
  on public.broadcast_reads for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);
