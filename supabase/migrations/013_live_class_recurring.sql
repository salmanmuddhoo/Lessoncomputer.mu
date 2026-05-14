-- Add recurring schedule fields to live_classes
alter table public.live_classes
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurrence_day_of_week int, -- 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
  add column if not exists end_time time; -- class end time, e.g. '18:30:00'
