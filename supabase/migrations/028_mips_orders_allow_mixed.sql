-- Allow 'mixed' order_type on mips_orders.
-- Migration 024 constrained order_type to ('video','live'), but combined
-- live + video purchases send order_type = 'mixed'. Inserting 'mixed' violated the
-- CHECK constraint, and the error text ("... violates check constraint on relation
-- ...") was mis-reported to users as "migration 024 not applied".

alter table public.mips_orders drop constraint if exists mips_orders_order_type_check;

alter table public.mips_orders
  add constraint mips_orders_order_type_check
  check (order_type in ('video', 'live', 'mixed'));
