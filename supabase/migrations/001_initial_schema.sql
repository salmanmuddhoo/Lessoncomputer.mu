-- LessonComputer.mu — Initial Database Schema
-- Run this in your Supabase SQL editor or as a migration

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- Profiles (extends auth.users)
-- ============================================================
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  role        text not null default 'student' check (role in ('admin', 'student')),
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Grades
-- ============================================================
create table public.grades (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  description text,
  color       text not null default '#FACC15',
  order_index integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Seed default grades
insert into public.grades (name, slug, description, color, order_index) values
  ('Grade 7',       'grade-7',  'Foundation of secondary education',   '#FACC15', 1),
  ('Grade 8',       'grade-8',  'Building core academic skills',       '#EAB308', 2),
  ('Grade 9',       'grade-9',  'Advancing towards School Certificate','#CA8A04', 3),
  ('Grade 10',      'grade-10', 'Consolidation for SC preparation',    '#A16207', 4),
  ('Grade 11 (SC)', 'grade-11', 'School Certificate Year',             '#854D0E', 5),
  ('Grade 12 (HSC)','grade-12', 'Higher School Certificate Year',      '#713F12', 6);

-- ============================================================
-- Videos
-- ============================================================
create table public.videos (
  id               uuid primary key default uuid_generate_v4(),
  title            text not null,
  description      text,
  grade_id         uuid not null references public.grades(id) on delete restrict,
  streamable_url   text not null,
  thumbnail_url    text,
  price            numeric(10,2) not null default 0,
  is_free          boolean not null default true,
  duration_minutes integer,
  is_published     boolean not null default false,
  created_by       uuid not null references public.profiles(id) on delete restrict,
  created_at       timestamptz not null default now()
);

create index idx_videos_grade_id      on public.videos(grade_id);
create index idx_videos_is_published  on public.videos(is_published);
create index idx_videos_created_at    on public.videos(created_at desc);

-- ============================================================
-- Live Classes
-- ============================================================
create table public.live_classes (
  id                     uuid primary key default uuid_generate_v4(),
  title                  text not null,
  description            text,
  grade_id               uuid not null references public.grades(id) on delete restrict,
  streamable_replay_url  text,
  meet_url               text,
  scheduled_at           timestamptz not null,
  price                  numeric(10,2) not null default 0,
  is_subscription_only   boolean not null default false,
  max_students           integer,
  is_published           boolean not null default false,
  created_by             uuid not null references public.profiles(id) on delete restrict,
  created_at             timestamptz not null default now()
);

create index idx_live_classes_grade_id     on public.live_classes(grade_id);
create index idx_live_classes_scheduled_at on public.live_classes(scheduled_at);

-- ============================================================
-- Purchases (one-time video purchases)
-- ============================================================
create table public.purchases (
  id          uuid primary key default uuid_generate_v4(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  video_id    uuid not null references public.videos(id) on delete restrict,
  amount      numeric(10,2) not null,
  status      text not null default 'pending' check (status in ('pending', 'completed', 'refunded')),
  created_at  timestamptz not null default now(),
  unique (student_id, video_id)
);

create index idx_purchases_student_id on public.purchases(student_id);
create index idx_purchases_video_id   on public.purchases(video_id);

-- ============================================================
-- Subscriptions (recurring access — grade or all)
-- ============================================================
create table public.subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  grade_id    uuid references public.grades(id) on delete set null,
  plan        text not null check (plan in ('monthly', 'yearly')),
  status      text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,
  created_at  timestamptz not null default now()
);

create index idx_subscriptions_student_id on public.subscriptions(student_id);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles    enable row level security;
alter table public.grades      enable row level security;
alter table public.videos      enable row level security;
alter table public.live_classes enable row level security;
alter table public.purchases   enable row level security;
alter table public.subscriptions enable row level security;

-- Profiles: own row + admins see all
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- Grades: public read, admin write
create policy "Grades are publicly readable"
  on public.grades for select using (true);

create policy "Admins can manage grades"
  on public.grades for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- Videos: published videos public, admin manages all
create policy "Published videos are publicly readable"
  on public.videos for select using (is_published = true);

create policy "Admins can manage videos"
  on public.videos for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- Live classes: published classes public, admin manages all
create policy "Published live classes are publicly readable"
  on public.live_classes for select using (is_published = true);

create policy "Admins can manage live classes"
  on public.live_classes for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- Purchases: own purchases only
create policy "Students can read own purchases"
  on public.purchases for select using (auth.uid() = student_id);

create policy "Students can create purchases"
  on public.purchases for insert with check (auth.uid() = student_id);

create policy "Admins can read all purchases"
  on public.purchases for select
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- Subscriptions: own subscriptions only
create policy "Students can read own subscriptions"
  on public.subscriptions for select using (auth.uid() = student_id);

create policy "Admins can read all subscriptions"
  on public.subscriptions for select
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));
