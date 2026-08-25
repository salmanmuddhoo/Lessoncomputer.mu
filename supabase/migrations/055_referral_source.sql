-- Capture "How did you hear about us?" at signup for marketing insight.
-- Stored on profiles; populated from auth user_metadata by the handle_new_user trigger
-- (email signups) or the onboarding API (Google signups).

alter table public.profiles
  add column if not exists referral_source text;

-- Redefine the new-user trigger to also carry referral_source across from user_metadata,
-- keeping the existing "prefer the existing profile value" precedence (migration 046).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, grade_id, referral_source)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    nullif(new.raw_user_meta_data->>'grade_id', '')::uuid,
    nullif(new.raw_user_meta_data->>'referral_source', '')
  )
  on conflict (id) do update set
    full_name       = coalesce(public.profiles.full_name, excluded.full_name),
    grade_id        = coalesce(public.profiles.grade_id, excluded.grade_id),
    referral_source = coalesce(public.profiles.referral_source, excluded.referral_source);
  return new;
end;
$$;
