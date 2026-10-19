-- ============================================================================
-- Free Rein — Batch 12: activity types on lessons + horse training log
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

-- Work/activity categories worked in a lesson (e.g. ["Flat work","Jumping"]).
alter table public.lessons add column if not exists work_types jsonb default '[]'::jsonb;

-- Training sessions a trainer logs on a specific horse (client can track progress).
create table if not exists public.training_sessions (
  id           uuid primary key default gen_random_uuid(),
  barn_id      uuid references public.barns(id) on delete cascade,
  horse_id     uuid references public.horses(id) on delete cascade,
  trainer_id   uuid references public.users(id) on delete set null,
  trainer_name text,
  date         date,
  work_types   jsonb default '[]'::jsonb,   -- ["Groundwork","Flat work","Jumping"]
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists training_horse_idx on public.training_sessions (horse_id, date desc);

alter table public.training_sessions enable row level security;

-- Staff manage all training in their barn.
drop policy if exists train_staff on public.training_sessions;
create policy train_staff on public.training_sessions for all
  using (barn_id = public.my_barn_id() and public.is_staff())
  with check (barn_id = public.my_barn_id() and public.is_staff());

-- A client can read training logs for a horse their family owns.
drop policy if exists train_client_read on public.training_sessions;
create policy train_client_read on public.training_sessions for select
  using (barn_id = public.my_barn_id()
         and horse_id in (select id from public.horses where owner_family_id = public.my_family_id()));
