-- ============================================================================
-- Free Rein — Batch 8: make invites apply their role to EXISTING accounts
-- Fixes the case where an invited person already had a login, so the invite's
-- role (e.g. head_trainer) never took effect and they stayed a client.
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

create or replace function public.ensure_profile()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_inv   public.invites;
  v_user  public.users;
  v_barn  uuid;
  v_count int;
begin
  if v_uid is null then return; end if;
  select email into v_email from auth.users where id = v_uid;
  if v_email is null then return; end if;

  select * into v_user from public.users where auth_id = v_uid;

  if v_user.id is null then
    -- No profile yet: create from newest invite, else first-user=owner / default client.
    select * into v_inv from public.invites where lower(email) = lower(v_email)
      order by created_at desc limit 1;
    if v_inv.id is not null then
      insert into public.users (auth_id, barn_id, role, full_name, email, family_id)
      values (v_uid, v_inv.barn_id, v_inv.role,
              coalesce(v_inv.full_name, split_part(v_email,'@',1)), v_email, v_inv.family_id);
      update public.invites set accepted = true where id = v_inv.id;
    else
      select count(*) into v_count from public.users;
      if v_count = 0 then
        insert into public.barns (name) values ('Free Rein Riding Academy') returning id into v_barn;
        insert into public.users (auth_id, barn_id, role, full_name, email)
        values (v_uid, v_barn, 'owner', split_part(v_email,'@',1), v_email);
      else
        select id into v_barn from public.barns order by created_at asc limit 1;
        insert into public.users (auth_id, barn_id, role, full_name, email)
        values (v_uid, v_barn, 'client', split_part(v_email,'@',1), v_email);
      end if;
    end if;
  else
    -- Profile exists: apply any UNACCEPTED invite — this upgrades their role
    -- (e.g. client -> head_trainer) and/or links a family.
    select * into v_inv from public.invites
      where lower(email) = lower(v_email) and accepted = false
      order by created_at desc limit 1;
    if v_inv.id is not null then
      update public.users set
        role      = v_inv.role,
        barn_id   = coalesce(v_inv.barn_id, barn_id),
        family_id = coalesce(v_inv.family_id, family_id)
      where auth_id = v_uid;
      update public.invites set accepted = true where id = v_inv.id;
    end if;
  end if;
end $$;

grant execute on function public.ensure_profile() to authenticated;

-- ---- One-time repair: apply any pending invite to the matching existing user now
update public.users u set
  role      = i.role,
  barn_id   = coalesce(i.barn_id, u.barn_id),
  family_id = coalesce(i.family_id, u.family_id)
from public.invites i
where lower(u.email) = lower(i.email) and i.accepted = false;

update public.invites i set accepted = true
from public.users u
where lower(u.email) = lower(i.email) and i.accepted = false;
