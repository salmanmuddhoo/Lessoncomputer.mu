-- Legal pages (Developer Work doc): checkout confirmations, age data, account closure,
-- and keeping transaction records after an account is deleted.

-- §5: every checkout tick box is stored with date, time and account. Kept if the account is
-- later deleted (student_id → null) since it evidences consent for a retained payment record.
create table if not exists public.checkout_consents (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid references public.profiles(id) on delete set null,
  order_id      uuid references public.mips_orders(id) on delete set null,
  consent_type  text not null check (consent_type in ('terms', 'guardian', 'immediate_access')),
  consent_text  text not null,
  ticked_at     timestamptz not null,           -- when the box was ticked in the browser
  recorded_at   timestamptz not null default now()
);
create index if not exists checkout_consents_student_idx on public.checkout_consents(student_id);
create index if not exists checkout_consents_order_idx on public.checkout_consents(order_id);

alter table public.checkout_consents enable row level security;
drop policy if exists "Admins read checkout consents" on public.checkout_consents;
create policy "Admins read checkout consents"
  on public.checkout_consents for select
  using (public.is_admin());

alter table public.profiles
  -- §5 / Cookie Policy §4: set from the checkout answer. null = not yet known.
  add column if not exists is_under_18 boolean,
  -- §7: the student confirmed at signup that they are at least 11.
  add column if not exists age_confirmed_at timestamptz,
  -- Account closed (deactivated). Drives the 12-month deletion in the retention job.
  add column if not exists closed_at timestamptz;

-- Privacy Policy §12: payment and transaction records are kept 7 years for tax law, even
-- after an account is deleted. Orders previously cascaded away with the user.
alter table public.mips_orders alter column student_id drop not null;
alter table public.mips_orders drop constraint if exists mips_orders_student_id_fkey;
alter table public.mips_orders
  add constraint mips_orders_student_id_fkey
  foreign key (student_id) references auth.users(id) on delete set null;
alter table public.mips_orders drop constraint if exists mips_orders_student_id_profiles_fkey;
alter table public.mips_orders
  add constraint mips_orders_student_id_profiles_fkey
  foreign key (student_id) references public.profiles(id) on delete set null;

-- §6: account notices addressed to one student (subscription price change, attendance or
-- conduct). student_id null = grade-wide broadcast as before; set = only that student sees it.
alter table public.broadcasts
  add column if not exists student_id uuid references public.profiles(id) on delete cascade;
create index if not exists broadcasts_student_idx on public.broadcasts(student_id);

drop policy if exists "Students read grade broadcasts" on public.broadcasts;
create policy "Students read grade broadcasts"
  on public.broadcasts for select
  to authenticated
  using (
    (student_id is null and grade_id = (select grade_id from public.profiles where id = auth.uid()))
    or student_id = auth.uid()
  );
