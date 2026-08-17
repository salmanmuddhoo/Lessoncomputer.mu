-- Chapter visibility for live subscribers is an OPT-OUT control: a chapter is visible to
-- live-class subscribers unless an admin explicitly hides it. The column previously
-- defaulted to false and was never read, so make it default true and treat every existing
-- chapter as visible (nothing that is currently shown becomes hidden by this change).

alter table public.chapters
  alter column is_visible_to_subscribers set default true;

update public.chapters
  set is_visible_to_subscribers = true
  where is_visible_to_subscribers is distinct from true;
