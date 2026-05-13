-- Fix: replace recursive admin RLS checks with a security definer function
--
-- The original policies used:
--   exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
-- directly inside policies on public.profiles (and on other tables whose policies
-- query profiles). This creates an infinite recursion → Supabase returns 500.
--
-- The fix: a SECURITY DEFINER function runs as the function owner and skips RLS,
-- breaking the recursion safely.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

-- ── profiles ────────────────────────────────────────────────────────────────
drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.is_admin());

-- ── grades ──────────────────────────────────────────────────────────────────
drop policy if exists "Admins can manage grades" on public.grades;
create policy "Admins can manage grades"
  on public.grades for all
  using (public.is_admin());

-- ── chapters ─────────────────────────────────────────────────────────────────
drop policy if exists "Admins can manage chapters" on public.chapters;
create policy "Admins can manage chapters"
  on public.chapters for all
  using (public.is_admin());

-- ── videos ──────────────────────────────────────────────────────────────────
drop policy if exists "Admins can manage videos" on public.videos;
create policy "Admins can manage videos"
  on public.videos for all
  using (public.is_admin());

-- ── live_classes ─────────────────────────────────────────────────────────────
drop policy if exists "Admins can manage live classes" on public.live_classes;
create policy "Admins can manage live classes"
  on public.live_classes for all
  using (public.is_admin());

-- ── purchases ────────────────────────────────────────────────────────────────
drop policy if exists "Admins can read all purchases" on public.purchases;
create policy "Admins can read all purchases"
  on public.purchases for select
  using (public.is_admin());

-- ── subscriptions ────────────────────────────────────────────────────────────
drop policy if exists "Admins can read all subscriptions" on public.subscriptions;
create policy "Admins can read all subscriptions"
  on public.subscriptions for select
  using (public.is_admin());
