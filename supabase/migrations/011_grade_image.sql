-- Add image URL to grades table for grade card photos
alter table public.grades
  add column if not exists image_url text;
