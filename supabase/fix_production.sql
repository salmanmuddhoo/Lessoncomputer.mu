-- ============================================================
-- LessonComputer.mu — Production Diagnostic & Fix Script
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. PROMOTE YOUR ACCOUNT TO ADMIN ────────────────────────
-- Replace the email below with YOUR login email.
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'
);

-- ── 2. VERIFY TABLES EXIST ──────────────────────────────────
-- Should return rows for: profiles, grades, chapters, videos, live_classes, purchases, subscriptions
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles','grades','chapters','videos','live_classes','purchases','subscriptions')
ORDER BY table_name;

-- ── 3. VERIFY chapters TABLE HAS CORRECT COLUMNS ─────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'chapters'
ORDER BY ordinal_position;

-- ── 4. VERIFY videos TABLE HAS chapter_id COLUMN ─────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'videos'
  AND column_name = 'chapter_id';

-- ── 5. IF chapters TABLE IS MISSING — run this block ─────────
-- (Only needed if step 2 did NOT return 'chapters')

/*
CREATE TABLE IF NOT EXISTS public.chapters (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  grade_id    uuid NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chapters_grade_id ON public.chapters(grade_id);
CREATE INDEX IF NOT EXISTS idx_chapters_order    ON public.chapters(grade_id, order_index);

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_videos_chapter_id ON public.videos(chapter_id);

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chapters are publicly readable"
  ON public.chapters FOR SELECT USING (true);

CREATE POLICY "Admins can manage chapters"
  ON public.chapters FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));
*/

-- ── 6. CHECK YOUR CURRENT ROLE ───────────────────────────────
SELECT u.email, p.role
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'YOUR_EMAIL_HERE';
