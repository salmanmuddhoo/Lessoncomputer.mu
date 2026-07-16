-- New signups still showed a blank full_name / grade on the account page. The
-- profile is populated from signup metadata by the handle_new_user trigger, but
-- earlier attempts (migrations 028, 042) may not have applied cleanly in every
-- environment (a duplicate-028 version collision previously broke the pipeline).
-- Re-assert the trigger under a fresh, unique version so it definitely takes effect,
-- make it resilient (a bad value can never break signup), and backfill any existing
-- profiles that are missing the values from auth.users metadata.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, grade_id)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'grade_id', '')::uuid
  )
  on conflict (id) do update
    set full_name = coalesce(public.profiles.full_name, excluded.full_name),
        grade_id  = coalesce(public.profiles.grade_id,  excluded.grade_id);
  return new;
exception
  -- Never let profile population abort the signup itself.
  when others then
    raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
    return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill existing profiles that are missing full_name / grade_id from the values
-- captured in auth.users metadata at signup.
update public.profiles p
set full_name = coalesce(p.full_name, nullif(u.raw_user_meta_data->>'full_name', '')),
    grade_id  = coalesce(p.grade_id,  nullif(u.raw_user_meta_data->>'grade_id', '')::uuid)
from auth.users u
where u.id = p.id
  and (p.full_name is null or p.grade_id is null);
