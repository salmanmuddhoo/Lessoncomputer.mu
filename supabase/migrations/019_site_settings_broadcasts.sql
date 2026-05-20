-- Site settings: single-row table for global configuration
create table if not exists public.site_settings (
  id                int primary key default 1,
  facebook_url      text,
  instagram_url     text,
  tiktok_url        text,
  whatsapp_number   text,  -- digits only, e.g. 23052312345
  updated_at        timestamptz not null default now(),
  constraint single_row check (id = 1)
);

-- Seed the single row so upsert always works
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

alter table public.site_settings enable row level security;

create policy "Public can read site settings"
  on public.site_settings for select
  using (true);

create policy "Admins manage site settings"
  on public.site_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- Broadcasts: admin sends homework / notices to grade-specific students
create table if not exists public.broadcasts (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  body             text not null,
  grade_id         uuid not null references public.grades(id) on delete cascade,
  target_audience  text not null default 'all'
                     check (target_audience in ('all', 'live', 'video')),
  created_by       uuid not null references auth.users(id),
  created_at       timestamptz not null default now()
);

create index on public.broadcasts(grade_id);
create index on public.broadcasts(created_at desc);

alter table public.broadcasts enable row level security;

create policy "Admins manage broadcasts"
  on public.broadcasts for all
  using (public.is_admin())
  with check (public.is_admin());

-- Students can read broadcasts that match their grade
create policy "Students read grade broadcasts"
  on public.broadcasts for select
  to authenticated
  using (
    grade_id = (select grade_id from public.profiles where id = auth.uid())
  );
