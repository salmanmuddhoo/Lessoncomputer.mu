-- Some auth.users have NO profiles row at all (their handle_new_user trigger never
-- ran — e.g. accounts created before the trigger was applied). This breaks anything
-- with a foreign key to profiles: creating a payment fails with
--   insert or update on table "mips_orders" violates foreign key constraint
--   "mips_orders_student_id_profiles_fkey"
-- because there is no matching profiles row.
--
-- Migration 046 only UPDATED existing profiles; it could not fix users who have no
-- row. Insert the missing rows here (as students, carrying any name/grade captured at
-- signup). Idempotent: existing profiles are left untouched.

insert into public.profiles (id, full_name, grade_id)
select
  u.id,
  nullif(u.raw_user_meta_data->>'full_name', ''),
  nullif(u.raw_user_meta_data->>'grade_id', '')::uuid
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
