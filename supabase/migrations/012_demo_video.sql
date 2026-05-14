-- Add is_demo flag to videos; demo videos are publicly accessible without login or subscription
alter table public.videos
  add column if not exists is_demo boolean not null default false;
