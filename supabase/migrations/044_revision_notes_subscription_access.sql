-- SECURITY (P0): the student read policy on revision_notes was
--   using (is_published = true or is_published_for_live = true)
-- i.e. ANY published note was readable by anyone — and because the anon key is
-- public, the paid HTML content (content / content_live) could be fetched directly
-- over the REST API or via the unauthenticated /notes/[id] page, with no grade or
-- subscription check.
--
-- Replace it with a subscription-aware policy: a student may read a note only if
-- they hold an ACTIVE subscription whose package includes the note's chapter. This
-- mirrors exactly how the student dashboards already surface notes (filtering by the
-- chapters of subscribed packages via subscription_package_chapters), so legitimate
-- access is unchanged while the open hole is closed. Admins keep full access via the
-- existing admin_all_revision_notes policy.

drop policy if exists "student_read_revision_notes" on public.revision_notes;

create policy "student_read_revision_notes" on public.revision_notes
  for select
  using (
    exists (
      select 1
      from public.student_subscriptions ss
      join public.subscription_package_chapters spc on spc.package_id = ss.package_id
      where ss.student_id = (select auth.uid())
        and ss.status = 'active'
        and spc.chapter_id = public.revision_notes.chapter_id
    )
  );
