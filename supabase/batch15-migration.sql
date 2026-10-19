-- ============================================================================
-- Free Rein — batch 15
-- Permission: let a head trainer edit staff (name + role) when enabled.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.
-- ============================================================================

alter table public.barns
  add column if not exists head_can_edit_staff boolean not null default false;

-- Can the current user manage staff? Owner always; head trainer only when the
-- barn has enabled it. SECURITY DEFINER so it reads users/barns without tripping
-- row-level security recursion inside the policy below.
create or replace function public.can_manage_staff()
returns boolean language sql security definer stable as $$
  select exists (
    select 1
    from public.users u
    left join public.barns b on b.id = u.barn_id
    where u.auth_id = auth.uid()
      and (u.role = 'owner'
           or (u.role = 'head_trainer' and coalesce(b.head_can_edit_staff, false)))
  );
$$;

-- Allow those users to update staff rows within their own barn.
drop policy if exists users_manage_staff on public.users;
create policy users_manage_staff on public.users for update
  using (public.can_manage_staff() and barn_id = public.my_barn_id())
  with check (public.can_manage_staff() and barn_id = public.my_barn_id());
