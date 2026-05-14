-- Allow unauthenticated (public) read access to subscription packages
-- so grade pages show packages to non-logged-in visitors

create policy "Public read active packages"
  on public.subscription_packages for select
  to anon
  using (is_active = true);

create policy "Public read package chapters"
  on public.subscription_package_chapters for select
  to anon
  using (true);
