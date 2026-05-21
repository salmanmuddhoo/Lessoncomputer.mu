-- Add MIPS payment environment toggle to site_settings
alter table public.site_settings
  add column if not exists mips_environment text not null default 'test'
    check (mips_environment in ('test', 'production'));

-- Table to track payment orders before and after MIPS callback
create table if not exists public.mips_orders (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references auth.users(id) on delete cascade,
  order_type     text not null check (order_type in ('video', 'live')),
  package_ids    text[] not null,
  is_recurring   boolean not null default false,
  amount         numeric(10, 2) not null,
  currency       text not null default 'MUR',
  description    text,
  status         text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled')),
  mips_transaction_id text unique,
  metadata       jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.mips_orders enable row level security;

create policy "Admin full access to mips_orders"
  on public.mips_orders for all
  using (is_admin());

create policy "Students view own orders"
  on public.mips_orders for select
  using (auth.uid() = student_id);

create policy "Students insert own orders"
  on public.mips_orders for insert
  with check (auth.uid() = student_id);

create index if not exists mips_orders_student_id_idx on public.mips_orders(student_id);
create index if not exists mips_orders_status_idx on public.mips_orders(status);
