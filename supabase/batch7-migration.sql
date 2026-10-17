-- ============================================================================
-- Free Rein — Batch 7: scheduling, arena, trainer pay, client billing
-- Sets up the database for all four. Run once in Supabase → SQL Editor.
-- Safe to re-run.
-- ============================================================================

-- ---- Lessons: who taught, fee, duration, recurring link ----
alter table public.lessons add column if not exists trainer_id   uuid references public.users(id) on delete set null;
alter table public.lessons add column if not exists trainer_name text;
alter table public.lessons add column if not exists fee          numeric default 0;
alter table public.lessons add column if not exists duration_min int default 60;
alter table public.lessons add column if not exists series_id    uuid;
alter table public.lessons add column if not exists family_id    uuid references public.families(id) on delete set null;

-- ---- Recurring standing-lesson templates ----
create table if not exists public.lesson_series (
  id           uuid primary key default gen_random_uuid(),
  barn_id      uuid references public.barns(id) on delete cascade,
  rider_name   text,
  family_id    uuid references public.families(id) on delete set null,
  horse_name   text,
  trainer_id   uuid references public.users(id) on delete set null,
  trainer_name text,
  lesson_type  text default 'Private',
  dow          int,                 -- 0=Sun .. 6=Sat
  time_label   text,
  fee          numeric default 0,
  duration_min int default 60,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---- Trainer pay config (per person) ----
alter table public.users add column if not exists pay_type text;            -- 'per_lesson' | 'hourly' | 'percent' | 'manual'
alter table public.users add column if not exists pay_rate numeric default 0;

-- ---- Family billing config (per family) ----
alter table public.families add column if not exists billing_mode text default 'manual';  -- 'monthly' | 'per_lesson' | 'manual'
alter table public.families add column if not exists monthly_fee  numeric default 0;

-- ---- Charges ledger (running balance = sum(charges) - sum(payments)) ----
create table if not exists public.charges (
  id         uuid primary key default gen_random_uuid(),
  barn_id    uuid references public.barns(id) on delete cascade,
  family_id  uuid references public.families(id) on delete cascade,
  label      text,
  amount     numeric not null default 0,
  lesson_id  uuid,
  created_at timestamptz not null default now()
);
create index if not exists charges_family_idx on public.charges (family_id);

-- ---- Arena open hours (per barn) ----
alter table public.barns add column if not exists arena_open  text default '7:00 AM';
alter table public.barns add column if not exists arena_close text default '7:00 PM';
alter table public.barns add column if not exists arena_days  jsonb default '{"0":true,"1":true,"2":true,"3":true,"4":true,"5":true,"6":true}'::jsonb;
alter table public.barns add column if not exists arena_slot_min int default 60;

-- ---- Arena bookings / open-ride requests ----
create table if not exists public.arena_bookings (
  id          uuid primary key default gen_random_uuid(),
  barn_id     uuid references public.barns(id) on delete cascade,
  family_id   uuid references public.families(id) on delete set null,
  rider_name  text,
  date        date,
  start_label text,
  status      text not null default 'requested',  -- 'requested' | 'approved' | 'denied'
  created_at  timestamptz not null default now()
);
create index if not exists arena_bookings_date_idx on public.arena_bookings (date);

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.lesson_series  enable row level security;
alter table public.charges        enable row level security;
alter table public.arena_bookings enable row level security;

-- lesson_series: staff manage; clients read their own
drop policy if exists series_staff on public.lesson_series;
create policy series_staff on public.lesson_series for all
  using (barn_id = public.my_barn_id() and public.is_staff())
  with check (barn_id = public.my_barn_id() and public.is_staff());
drop policy if exists series_client_read on public.lesson_series;
create policy series_client_read on public.lesson_series for select
  using (barn_id = public.my_barn_id() and family_id = public.my_family_id());

-- charges: staff manage; clients read their own
drop policy if exists charges_staff on public.charges;
create policy charges_staff on public.charges for all
  using (barn_id = public.my_barn_id() and public.is_staff())
  with check (barn_id = public.my_barn_id() and public.is_staff());
drop policy if exists charges_client_read on public.charges;
create policy charges_client_read on public.charges for select
  using (barn_id = public.my_barn_id() and family_id = public.my_family_id());

-- arena_bookings: staff manage all; clients insert their own + read all in barn
-- (so they can see which open slots are already taken)
drop policy if exists arena_staff on public.arena_bookings;
create policy arena_staff on public.arena_bookings for all
  using (barn_id = public.my_barn_id() and public.is_staff())
  with check (barn_id = public.my_barn_id() and public.is_staff());
drop policy if exists arena_client_read on public.arena_bookings;
create policy arena_client_read on public.arena_bookings for select
  using (barn_id = public.my_barn_id());
drop policy if exists arena_client_insert on public.arena_bookings;
create policy arena_client_insert on public.arena_bookings for insert
  with check (barn_id = public.my_barn_id() and family_id = public.my_family_id());
