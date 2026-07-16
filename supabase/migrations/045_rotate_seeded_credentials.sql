-- SECURITY (P0): migration 002_seed_test_accounts.sql seeds an ADMIN account
-- (admin@lessoncomputer.mu) and a student account with passwords hardcoded in the
-- committed repo. Because .github/workflows/migrate.yml runs `supabase db push` on
-- every merge to main, those known-credential accounts can reach production, where
-- anyone reading the repo could log in as admin.
--
-- This migration neutralizes that by rotating the password to an unguessable random
-- value — but ONLY for accounts that STILL carry the hardcoded seed password. If the
-- owner has already changed the password to something of their own, the WHERE clause
-- won't match and the account is left completely untouched (no lock-out). It also
-- self-heals fresh installs, since it runs after 002.
--
-- After this runs, use "Forgot password" to set a real password for any seeded
-- account you actually intend to use.

create extension if not exists pgcrypto;

do $$
begin
  -- Admin seed account: rotate only if the password is still 'AdminLC2024!'.
  update auth.users
  set encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf'))
  where email = 'admin@lessoncomputer.mu'
    and encrypted_password = crypt('AdminLC2024!', encrypted_password);

  -- Student seed account: rotate only if the password is still 'StudentLC2024!'.
  update auth.users
  set encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf'))
  where email = 'student@lessoncomputer.mu'
    and encrypted_password = crypt('StudentLC2024!', encrypted_password);
exception
  when undefined_table or insufficient_privilege then
    -- auth.users not reachable in this context — best effort, never block the pipeline.
    null;
end $$;
