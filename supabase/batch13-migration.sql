-- ============================================================================
-- Free Rein — batch 13
-- Per-family billing day: the day of the month monthly fee + board are charged.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.
-- ============================================================================

alter table public.families
  add column if not exists billing_day integer;

-- Default existing families to the 1st of the month.
update public.families set billing_day = 1 where billing_day is null;
