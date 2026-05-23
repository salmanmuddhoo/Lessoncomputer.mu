-- Add card_last_four_digit to student_payment_tokens
-- Required for cancelling ODRP tokens via /api/cancel_odrp_token
alter table public.student_payment_tokens
  add column if not exists card_last_four_digit text;
