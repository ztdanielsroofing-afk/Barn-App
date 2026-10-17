-- ============================================================================
-- Free Rein — Batch 10: in-app notifications
-- A live feed that fills when things happen (requests, approvals, etc.).
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  barn_id    uuid references public.barns(id) on delete cascade,
  audience   text,                       -- 'staff' = all staff/owner; else null
  family_id  uuid references public.families(id) on delete cascade,  -- target a client family
  title      text not null,
  body       text,
  kind       text,                       -- 'request' | 'approval' | 'billing' | 'lesson' | 'info'
  link       text,                       -- optional More section to open
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_barn_idx on public.notifications (barn_id, created_at desc);

alter table public.notifications enable row level security;

-- See notifications addressed to my family, or staff-wide ones if I'm staff.
drop policy if exists notif_read on public.notifications;
create policy notif_read on public.notifications for select
  using (barn_id = public.my_barn_id()
         and (family_id = public.my_family_id() or (audience = 'staff' and public.is_staff())));

-- Any barn member may create a notification within their barn (clients notify
-- staff when they request; staff notify a family when they approve).
drop policy if exists notif_insert on public.notifications;
create policy notif_insert on public.notifications for insert
  with check (barn_id = public.my_barn_id());

-- Mark-as-read within the barn.
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update
  using (barn_id = public.my_barn_id())
  with check (barn_id = public.my_barn_id());
