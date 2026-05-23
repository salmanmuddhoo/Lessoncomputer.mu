-- Update handle_new_user trigger to capture grade_id from signup metadata.
-- Without this, grade_id is not set on profile creation because the client
-- is unauthenticated (email confirmation pending) when the register form
-- tries to update the profile via the API.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, grade_id)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    nullif(new.raw_user_meta_data->>'grade_id', '')::uuid
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        grade_id  = coalesce(excluded.grade_id, profiles.grade_id);
  return new;
end;
$$ language plpgsql security definer;
