-- Fix: student_payment_tokens was never populated because the callback upserts with
-- onConflict: 'student_id', but migration 025 only created a NON-unique index on
-- student_id. Postgres rejects ON CONFLICT without a matching unique constraint, so
-- every token upsert threw and the table stayed empty.
--
-- One active token per student is the intended model (cron & restore read it via
-- .eq('student_id', ...).single()), so enforce uniqueness on student_id.

-- Drop the redundant non-unique index; the unique index below covers lookups too.
drop index if exists public.student_payment_tokens_student_id_idx;

create unique index if not exists student_payment_tokens_student_id_key
  on public.student_payment_tokens(student_id);
