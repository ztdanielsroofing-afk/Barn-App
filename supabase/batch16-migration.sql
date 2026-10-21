-- ============================================================================
-- Free Rein — batch 16
-- Stop a staff member being downgraded back to "client" on login.
--
-- The previous ensure_profile re-applied the NEWEST unaccepted invite on every
-- login. If someone was invited as a family (client) and later made staff, a
-- lingering unaccepted client invite would flip them back to client each login,
-- which then re-created their family record. This version:
--   • never downgrades an existing staff member (owner/head_trainer/trainer)
--     to client from an invite,
--   • marks ALL of a user's pending invites accepted once handled, so none
--     re-applies on future logins.
-- Also a one-time cleanup: accept pending invites for anyone already staff.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
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
      update public.invites set accepted = true where lower(email) = lower(v_email) and accepted = false;
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
    -- Profile exists: apply the newest UNACCEPTED invite, but NEVER downgrade an
    -- existing staff member to client.
    select * into v_inv from public.invites
      where lower(email) = lower(v_email) and accepted = false
      order by created_at desc limit 1;
    if v_inv.id is not null then
      if v_user.role in ('owner','head_trainer','trainer') and v_inv.role = 'client' then
        -- Stale client invite for someone who is now staff: keep their role.
        null;
      else
        update public.users set
          role      = v_inv.role,
          barn_id   = coalesce(v_inv.barn_id, barn_id),
          family_id = coalesce(v_inv.family_id, family_id)
        where auth_id = v_uid;
      end if;
      -- Accept every pending invite for this email so none re-applies later.
      update public.invites set accepted = true where lower(email) = lower(v_email) and accepted = false;
    end if;
  end if;
end $$;

grant execute on function public.ensure_profile() to authenticated;

-- One-time cleanup: anyone who is already staff should not have a pending invite
-- waiting to downgrade them — accept them now.
update public.invites i set accepted = true
from public.users u
where lower(u.email) = lower(i.email) and u.role <> 'client' and i.accepted = false;
