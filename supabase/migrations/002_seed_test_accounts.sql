-- Seed test accounts for development and demo purposes
-- Idempotent: safe to run multiple times
--
-- Credentials:
--   Admin:   admin@lessoncomputer.mu  /  AdminLC2024!
--   Student: student@lessoncomputer.mu  /  StudentLC2024!

create extension if not exists pgcrypto;

do $$
declare
  v_admin_id   uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_student_id uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
begin

  -- ─── Admin account ────────────────────────────────────────────────────────
  if not exists (select 1 from auth.users where email = 'admin@lessoncomputer.mu') then

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change, phone_change_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id, 'authenticated', 'authenticated',
      'admin@lessoncomputer.mu',
      crypt('AdminLC2024!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Admin User"}'::jsonb,
      false, now(), now(), '', '', '', '', ''
    );

    -- Support both old (id uuid PK) and new (provider_id text PK) identity schemas
    begin
      insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
      values (
        v_admin_id::text, v_admin_id,
        format('{"sub":"%s","email":"admin@lessoncomputer.mu"}', v_admin_id)::jsonb,
        'email', now(), now()
      );
    exception when others then
      insert into auth.identities (id, user_id, identity_data, provider, created_at, updated_at)
      values (
        v_admin_id, v_admin_id,
        format('{"sub":"%s","email":"admin@lessoncomputer.mu"}', v_admin_id)::jsonb,
        'email', now(), now()
      );
    end;
  end if;

  -- Ensure admin role is set correctly (trigger creates 'student' by default)
  insert into public.profiles (id, role, full_name)
  values (v_admin_id, 'admin', 'Admin User')
  on conflict (id) do update set role = 'admin', full_name = 'Admin User';


  -- ─── Student account ──────────────────────────────────────────────────────
  if not exists (select 1 from auth.users where email = 'student@lessoncomputer.mu') then

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change, phone_change_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_student_id, 'authenticated', 'authenticated',
      'student@lessoncomputer.mu',
      crypt('StudentLC2024!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Test Student"}'::jsonb,
      false, now(), now(), '', '', '', '', ''
    );

    begin
      insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
      values (
        v_student_id::text, v_student_id,
        format('{"sub":"%s","email":"student@lessoncomputer.mu"}', v_student_id)::jsonb,
        'email', now(), now()
      );
    exception when others then
      insert into auth.identities (id, user_id, identity_data, provider, created_at, updated_at)
      values (
        v_student_id, v_student_id,
        format('{"sub":"%s","email":"student@lessoncomputer.mu"}', v_student_id)::jsonb,
        'email', now(), now()
      );
    end;
  end if;

  insert into public.profiles (id, role, full_name)
  values (v_student_id, 'student', 'Test Student')
  on conflict (id) do update set role = 'student', full_name = 'Test Student';

end $$;
