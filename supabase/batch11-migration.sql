-- ============================================================================
-- Free Rein — Batch 11: multiple riders per lesson (group lessons)
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================
alter table public.lessons add column if not exists participants jsonb default '[]'::jsonb;
-- participants: [{ "name": "...", "family_id": "..."|null }]
