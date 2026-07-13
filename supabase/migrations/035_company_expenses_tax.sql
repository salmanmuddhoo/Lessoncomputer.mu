-- Company expenses ledger + configurable tax rate, for the admin Finance/Tax dashboard.
-- Chargeable income = total paid sales - total expenses; tax = tax_rate% of chargeable income.

create table if not exists public.company_expenses (
  id           uuid primary key default gen_random_uuid(),
  category     text not null,
  description  text,
  amount       numeric(12, 2) not null check (amount >= 0),
  currency     text not null default 'MUR',
  expense_date date not null default current_date,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.company_expenses enable row level security;

create policy "Admin full access to company_expenses"
  on public.company_expenses for all
  using (is_admin())
  with check (is_admin());

create index if not exists company_expenses_date_idx on public.company_expenses(expense_date);

-- Configurable corporate tax rate (percentage), default 15%.
alter table public.site_settings
  add column if not exists tax_rate numeric(5, 2) not null default 15;

comment on column public.site_settings.tax_rate is 'Corporate tax rate (%) applied to chargeable income (paid sales - expenses)';
