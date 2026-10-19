-- ============================================================================
-- Free Rein — batch 14
-- Trainer payouts: record what you've actually paid each trainer, so pay
-- screens can show Earned vs Paid out vs Still owed.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.
-- ============================================================================

create table if not exists public.payouts (
  id          uuid primary key default gen_random_uuid(),
  barn_id     uuid references public.barns(id) on delete cascade,
  trainer_id  uuid references public.users(id) on delete cascade,
  amount      numeric not null default 0,
  note        text,
  paid_on     date default (now() at time zone 'utc')::date,
  created_at  timestamptz not null default now()
);
create index if not exists payouts_trainer_idx on public.payouts (trainer_id, created_at desc);

alter table public.payouts enable row level security;

-- Staff who can see billing manage payouts for their barn.
drop policy if exists payouts_staff on public.payouts;
create policy payouts_staff on public.payouts for all
  using (barn_id = public.my_barn_id() and public.is_staff())
  with check (barn_id = public.my_barn_id() and public.is_staff());

-- A trainer can read their own payout records.
drop policy if exists payouts_self_read on public.payouts;
create policy payouts_self_read on public.payouts for select
  using (barn_id = public.my_barn_id() and trainer_id = auth.uid());
