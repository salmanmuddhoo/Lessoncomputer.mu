-- SECURITY (P0): paid content was world-readable via the public REST API.
--
-- The policies below all resolved to `using (is_published = true)`:
--   videos       → exposed streamable_url (the actual video)
--   live_classes → exposed meet_url + streamable_replay_url (join link + replay)
--   documents    → exposed file_url (worksheets/files)
-- Because the Supabase anon key is public, anyone could run
--   supabase.from('videos').select('streamable_url').eq('is_published', true)
-- straight from a browser console and harvest every paid item — no login required.
-- This is the SAME hole that migration 044 already closed for revision_notes; it just
-- was never applied to the other content tables.
--
-- Fix (mirrors 044): gate the base-table rows on free/demo OR an active subscription
-- whose package covers the row's chapter, and expose ONLY the non-secret "catalogue"
-- columns publicly through SECURITY DEFINER views (which the public marketing pages
-- read for listings/counts). Admins keep full access via their existing FOR ALL policies.

-- ========================= VIDEOS =========================
drop policy if exists "Published videos are publicly readable" on public.videos;

-- Free & demo videos stay fully public (free lessons + preview modal on grade pages).
create policy "videos_free_public" on public.videos
  for select to anon, authenticated
  using (
    (is_published = true or is_published_for_live = true)
    and (is_free = true or is_demo = true)
  );

-- A student may read a paid video only while holding an active subscription whose
-- package includes the video's chapter (identical shape to the 044 notes policy).
create policy "videos_subscriber_read" on public.videos
  for select to authenticated
  using (
    chapter_id is not null and exists (
      select 1
      from public.student_subscriptions ss
      join public.subscription_package_chapters spc on spc.package_id = ss.package_id
      where ss.student_id = (select auth.uid())
        and ss.status = 'active'
        and spc.chapter_id = public.videos.chapter_id
    )
  );

-- Public catalogue: every published video, but WITHOUT streamable_url / streamable_url_live.
-- security_invoker = false → the view runs with the definer's rights and bypasses the
-- base-table RLS, so it can safely surface just these non-secret columns to everyone.
drop view if exists public.videos_catalogue;
create view public.videos_catalogue
  with (security_invoker = false) as
  select id, title, description, grade_id, chapter_id, thumbnail_url, price,
         is_free, is_demo, duration_minutes, is_published, is_published_for_live, created_at
  from public.videos
  where is_published = true or is_published_for_live = true;
grant select on public.videos_catalogue to anon, authenticated;

-- ========================= DOCUMENTS =========================
drop policy if exists "Published documents are publicly readable" on public.documents;

create policy "documents_subscriber_read" on public.documents
  for select to authenticated
  using (
    chapter_id is not null and exists (
      select 1
      from public.student_subscriptions ss
      join public.subscription_package_chapters spc on spc.package_id = ss.package_id
      where ss.student_id = (select auth.uid())
        and ss.status = 'active'
        and spc.chapter_id = public.documents.chapter_id
    )
  );

-- ========================= LIVE CLASSES =========================
drop policy if exists "Published live classes are publicly readable" on public.live_classes;

-- meet_url / streamable_replay_url are readable only by a current live subscriber for the
-- class's grade (an active subscription to a live_month package of that grade).
create policy "live_classes_subscriber_read" on public.live_classes
  for select to authenticated
  using (
    exists (
      select 1
      from public.student_subscriptions ss
      where ss.student_id = (select auth.uid())
        and ss.status = 'active'
        and ss.package_id in (
          select sp.id from public.subscription_packages sp
          where sp.grade_id = public.live_classes.grade_id
            and sp.package_type = 'live_month'
        )
    )
  );

-- Public catalogue: schedule/title/grade for every published class, WITHOUT meet_url or
-- streamable_replay_url. Used by the marketing live-classes list, grade pages, and the
-- attendance history (which must survive a student lapsing between subscriptions).
drop view if exists public.live_classes_catalogue;
create view public.live_classes_catalogue
  with (security_invoker = false) as
  select lc.id, lc.title, lc.description, lc.grade_id, lc.scheduled_at, lc.price,
         lc.is_subscription_only, lc.max_students, lc.is_published, lc.package_id,
         lc.is_recurring, lc.recurrence_day_of_week, lc.end_time, lc.attendance_open,
         lc.created_at,
         g.name  as grade_name,
         g.color as grade_color,
         g.slug  as grade_slug
  from public.live_classes lc
  left join public.grades g on g.id = lc.grade_id
  where lc.is_published = true;
grant select on public.live_classes_catalogue to anon, authenticated;
