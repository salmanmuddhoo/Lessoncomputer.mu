-- Recurring (cron) orders never recorded a transaction reference, so the Payments report
-- showed a blank "Transaction ID" for them. Going forward the cron sets mips_transaction_id
-- to the MIPS merchant order id (same as interactive payments). Backfill existing recurring
-- rows with the same derived reference (the undashed, 25-char order id — matching
-- toMipsOrderId) so historical recurring payments also show an ID.

update public.mips_orders
set mips_transaction_id = left(replace(id::text, '-', ''), 25)
where is_recurring = true
  and (mips_transaction_id is null or mips_transaction_id = '');
