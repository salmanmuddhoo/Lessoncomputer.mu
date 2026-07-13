-- Admin-defined financial years for the Finance/Tax dashboard.
-- Each has an explicit start/end date; income & expenses are scoped to that range,
-- so when one financial year ends the admin creates a new one and only sales made
-- within the new period are counted.

create table if not exists public.financial_years (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  start_date  date not null,
  end_date    date not null,
  created_at  timestamptz not null default now(),
  constraint financial_years_range_ck check (end_date >= start_date)
);

alter table public.financial_years enable row level security;

create policy "Admin full access to financial_years"
  on public.financial_years for all
  using (is_admin())
  with check (is_admin());

create index if not exists financial_years_start_idx on public.financial_years(start_date desc);
