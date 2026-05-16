create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  grade_id uuid not null references public.grades(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete set null,
  file_url text not null,
  file_name text,
  is_published boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "Admins can manage documents"
  on public.documents for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Published documents are publicly readable"
  on public.documents for select
  to anon, authenticated
  using (is_published = true);
