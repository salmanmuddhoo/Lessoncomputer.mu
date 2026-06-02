-- Add FK from mips_orders.student_id to profiles so PostgREST join works
-- mips_orders originally referenced auth.users(id); profiles.id also references auth.users(id)
-- so the student_id values are the same — safe to add this FK.
ALTER TABLE public.mips_orders
  ADD CONSTRAINT mips_orders_student_id_profiles_fkey
  FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
