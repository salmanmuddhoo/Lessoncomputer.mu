-- When a student picks "Other" for how they heard about us, capture the free-text detail.
-- Stored alongside referral_source; carried from user_metadata by the new-user trigger.

alter table public.profiles
  add column if not exists referral_other text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, grade_id, referral_source, referral_other)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    nullif(new.raw_user_meta_data->>'grade_id', '')::uuid,
    nullif(new.raw_user_meta_data->>'referral_source', ''),
    nullif(new.raw_user_meta_data->>'referral_other', '')
  )
  on conflict (id) do update set
    full_name       = coalesce(public.profiles.full_name, excluded.full_name),
    grade_id        = coalesce(public.profiles.grade_id, excluded.grade_id),
    referral_source = coalesce(public.profiles.referral_source, excluded.referral_source),
    referral_other  = coalesce(public.profiles.referral_other, excluded.referral_other);
  return new;
end;
$$;
