-- New signups had blank full_name / grade because the trigger that copies signup
-- metadata into profiles wasn't reliably applied (the earlier duplicate-028 version
-- collision likely skipped 028_handle_new_user_grade). Re-create the function AND
-- re-attach the trigger here under a fresh version so it definitely takes effect.

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
    set full_name = coalesce(excluded.full_name, public.profiles.full_name),
        grade_id  = coalesce(excluded.grade_id,  public.profiles.grade_id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill existing profiles that are missing full_name / grade_id from the values
-- captured in auth.users metadata at signup.
update public.profiles p
set full_name = coalesce(p.full_name, u.raw_user_meta_data->>'full_name'),
    grade_id  = coalesce(p.grade_id, nullif(u.raw_user_meta_data->>'grade_id', '')::uuid)
from auth.users u
where u.id = p.id
  and (p.full_name is null or p.grade_id is null);
