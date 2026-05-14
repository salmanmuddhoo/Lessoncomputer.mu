-- Track which subscription packages each student has purchased/been granted
create table if not exists public.student_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid references auth.users(id) on delete cascade not null,
  package_id    uuid references public.subscription_packages(id) on delete cascade not null,
  is_recurring  boolean not null default false,
  status        text not null default 'active' check (status in ('active', 'cancelled')),
  purchased_at  timestamptz not null default now(),
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  unique (student_id, package_id)
);

create index on public.student_subscriptions(student_id);
create index on public.student_subscriptions(package_id);

alter table public.student_subscriptions enable row level security;

-- Admins have full access
create policy "Admins manage student subscriptions"
  on public.student_subscriptions
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Students can read their own subscriptions
create policy "Students read own subscriptions"
  on public.student_subscriptions
  for select
  using (auth.uid() = student_id);
