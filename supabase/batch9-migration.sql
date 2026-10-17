-- ============================================================================
-- Free Rein — Batch 9: monthly board charge per family
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================
alter table public.families add column if not exists board_fee numeric default 0;
