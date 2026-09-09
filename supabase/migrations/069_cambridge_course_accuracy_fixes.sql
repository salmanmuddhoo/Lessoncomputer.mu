-- Cambridge syllabus accuracy fixes (audit spreadsheet, "COURSE NAMES — CRITICAL
-- CAMBRIDGE ACCURACY ERRORS" section). All updates are keyed on the immutable,
-- unique `slug` column, so they are safe no-ops if a slug no longer exists and
-- correctly overwrite whatever the current name/description happen to be.

-- 9618 AS Level candidates take Papers 1 & 2 only; A Level candidates take all
-- four. Paper 3 (Advanced Theory) and Paper 4 (practical programming) are the
-- A Level papers — there is no "AS Level Paper 3", so this course must never
-- be described that way, and it is not a Mauritius-only course.
update public.grades
set name = 'Cambridge International A Level Computer Science 9618 — Papers 3 & 4',
    description = 'Cambridge A Level Computer Science 9618 online tuition for Paper 3 (Advanced Theory) and Paper 4 (practical programming). Live classes and recordings, taught by a specialist with 15+ years on the syllabus.',
    is_mauritius_only = false
where slug = 'as-level-9618-paper-3-----4';

update public.grades
set name = 'Cambridge International AS Level Computer Science 9618 — Papers 1 & 2',
    description = 'Cambridge AS Level Computer Science 9618 (Paper 1 Theory Fundamentals, Paper 2 Fundamental Problem-solving and Programming Skills) — live classes and recordings, open to students worldwide.',
    is_mauritius_only = false
where slug = 'as-level-9618-paper-1--2';

-- 0478 (Cambridge IGCSE) and 2210 (Cambridge O Level) are different
-- qualifications sharing the same content and papers. Until the two are split
-- into separate course pages, this page must at least name both syllabus
-- codes correctly and drop the Mauritius-only badge.
update public.grades
set description = 'Full preparation for Cambridge IGCSE 0478 / O Level 2210 Paper 1 (Computer Systems) — topic by topic, with past-paper practice and marked homework.',
    is_mauritius_only = false
where slug = 'o-level-paper1-0478-2210';

-- This slug ("grade-11") actually serves the Cambridge O Level 0478/2210
-- Paper 2 course, not a Mauritius Grade 11 course — it still carried its
-- original seed description ("School Certificate Year") and a Mauritius-only
-- flag left over from before it was repurposed.
update public.grades
set description = 'Full preparation for Paper 2 (Algorithms, Programming and Logic) — pseudocode, trace tables, flowcharts, databases and Boolean logic.',
    is_mauritius_only = false
where slug = 'grade-11';
