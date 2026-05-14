-- Subscription packages table
create table if not exists public.subscription_packages (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  grade_id      uuid references public.grades(id) on delete cascade not null,
  price         numeric(10,2) not null default 0,
  month         smallint not null check (month between 1 and 12),
  year          smallint not null,
  is_active     boolean not null default true,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

-- Junction: which chapters are in each package
create table if not exists public.subscription_package_chapters (
  package_id  uuid references public.subscription_packages(id) on delete cascade not null,
  chapter_id  uuid references public.chapters(id) on delete cascade not null,
  primary key (package_id, chapter_id)
);

-- Indexes
create index on public.subscription_packages(grade_id);
create index on public.subscription_packages(year, month);

-- RLS
alter table public.subscription_packages enable row level security;
alter table public.subscription_package_chapters enable row level security;

-- Admins have full access
create policy "Admins manage packages"
  on public.subscription_packages
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins manage package chapters"
  on public.subscription_package_chapters
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Authenticated users can read active packages
create policy "Users read active packages"
  on public.subscription_packages
  for select
  using (auth.role() = 'authenticated' and is_active = true);

create policy "Users read package chapters"
  on public.subscription_package_chapters
  for select
  using (auth.role() = 'authenticated');
