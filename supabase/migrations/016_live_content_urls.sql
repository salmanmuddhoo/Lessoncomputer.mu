-- Live-specific URL and publish flag for videos
alter table public.videos
  add column if not exists streamable_url_live text;
alter table public.videos
  add column if not exists is_published_for_live boolean not null default false;

-- Live-specific URL and publish flag for documents
alter table public.documents
  add column if not exists file_url_live text;
alter table public.documents
  add column if not exists is_published_for_live boolean not null default false;

-- Allow live-published documents to be read publicly
drop policy if exists "Published documents are publicly readable" on public.documents;
create policy "Published documents are publicly readable"
  on public.documents for select
  to anon, authenticated
  using (is_published = true or is_published_for_live = true);
