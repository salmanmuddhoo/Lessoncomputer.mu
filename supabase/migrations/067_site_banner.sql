-- Configurable scrolling top banner (sales / general info, e.g. "Tuition starts 15 Sept —
-- enrol now!"). Public read already covers this via the existing site_settings policy.
alter table public.site_settings
  add column if not exists banner_enabled boolean not null default false,
  add column if not exists banner_text text,
  add column if not exists banner_link text;
