-- Testimonials shown on the homepage to build trust: video (streamable URL),
-- photos (uploaded), and result sheets (uploaded). Managed by admins.

create table if not exists public.testimonials (
  id           uuid primary key default gen_random_uuid(),
  type         text not null check (type in ('video', 'photo', 'result')),
  author_name  text,
  author_role  text,                 -- e.g. 'Student', 'Parent'
  quote        text,
  media_url    text not null,        -- streamable URL (video) or uploaded file public URL
  is_published boolean not null default true,
  order_index  int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.testimonials enable row level security;

-- Anyone can read published testimonials (homepage is public)
create policy "Public read published testimonials"
  on public.testimonials for select
  using (is_published = true);

-- Admins manage everything
create policy "Admins manage testimonials"
  on public.testimonials for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists testimonials_published_order_idx
  on public.testimonials(is_published, order_index);

-- ─── Storage bucket for uploaded photos / result sheets ───────────────────────
insert into storage.buckets (id, name, public)
values ('testimonials', 'testimonials', true)
on conflict (id) do nothing;

-- Public can read the media (bucket is public)
create policy "Public read testimonials media"
  on storage.objects for select
  using (bucket_id = 'testimonials');

-- Only admins can upload / change / remove testimonial media
create policy "Admins insert testimonials media"
  on storage.objects for insert
  with check (bucket_id = 'testimonials' and public.is_admin());

create policy "Admins update testimonials media"
  on storage.objects for update
  using (bucket_id = 'testimonials' and public.is_admin());

create policy "Admins delete testimonials media"
  on storage.objects for delete
  using (bucket_id = 'testimonials' and public.is_admin());
