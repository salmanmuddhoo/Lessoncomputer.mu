-- Store MIPS payment tokens for recurring live subscription claims
-- id_token (128 chars) is returned by MIPS in the IMN callback when tokenization is enabled
create table if not exists public.student_payment_tokens (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references auth.users(id) on delete cascade,
  grade_id        uuid references public.grades(id) on delete set null,
  id_token        text not null,                  -- 128-char MIPS token
  max_amount      numeric(10, 2) not null,        -- max claimable per period (from initial payment)
  currency        text not null default 'MUR',
  is_active       boolean not null default true,
  source_order_id uuid references public.mips_orders(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.student_payment_tokens enable row level security;

create policy "Admin full access to student_payment_tokens"
  on public.student_payment_tokens for all
  using (is_admin());

create index if not exists student_payment_tokens_student_id_idx on public.student_payment_tokens(student_id);
create index if not exists student_payment_tokens_active_idx     on public.student_payment_tokens(is_active) where is_active = true;

-- Track each recurring claim as its own mips_order row (reuses existing table)
-- No schema change needed: claim orders set order_type='live', is_recurring=true,
-- and store the token in metadata->>'id_token'
