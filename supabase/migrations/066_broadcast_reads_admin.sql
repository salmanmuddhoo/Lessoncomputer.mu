-- Admins need to clear broadcast_reads when they edit a message (so a student who already
-- read it sees it as unread again with the update) — there was no admin policy at all before.
drop policy if exists "Admins manage broadcast reads" on public.broadcast_reads;
create policy "Admins manage broadcast reads"
  on public.broadcast_reads for all
  using (public.is_admin())
  with check (public.is_admin());
