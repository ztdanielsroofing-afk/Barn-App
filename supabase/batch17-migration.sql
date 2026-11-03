-- ============================================================================
-- Free Rein — batch 17
-- Per-barn default lesson prices (by lesson type), editable in the Pricing tab.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.
-- ============================================================================

alter table public.barns
  add column if not exists lesson_prices jsonb not null default '{}'::jsonb;
