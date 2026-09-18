-- Sanjivani — validation guards, business-rule triggers, notification triggers,
-- and aggregate maintenance (avg_rating, remaining_budget) per spec §12 / §11.

-- ============================================================
-- 1. Column guards: privileged fields only change server-side
-- ============================================================

create or replace function public.guard_profile_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- role and suspension can only be changed by an admin or server-side (service role)
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'PROFILE_ROLE_IMMUTABLE';
    end if;
    if new.suspended is distinct from old.suspended then
      raise exception 'PROFILE_SUSPEND_ADMIN_ONLY';
    end if;
  end if;
  return new;
end;
$$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_changes();

create or replace function public.guard_ngo_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.verification_status is distinct from old.verification_status then
      raise exception 'NGO_VERIFICATION_ADMIN_ONLY';
    end if;
  end if;
  return new;
end;
$$;
create trigger ngos_guard before update on public.ngos
  for each row execute function public.guard_ngo_changes();

create or replace function public.guard_ngo_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- self-registered NGOs always start pending; rating is computed, never seeded by hand
  if auth.uid() is not null and not public.is_admin() then
    new.verification_status := 'pending';
    new.avg_rating := 0;
  end if;
  return new;
end;
$$;
create trigger ngos_insert_guard before insert on public.ngos
  for each row execute function public.guard_ngo_insert();

create or replace function public.guard_volunteer_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.verification_status is distinct from old.verification_status then
      raise exception 'VOLUNTEER_VERIFICATION_ADMIN_ONLY';
    end if;
  end if;
  return new;
end;
$$;
create trigger volunteers_guard before update on public.volunteers
  for each row execute function public.guard_volunteer_changes();

create or replace function public.guard_volunteer_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.verification_status := 'pending';
    new.avg_rating := 0;
  end if;
  return new;
end;
$$;
create trigger volunteers_insert_guard before insert on public.volunteers
  for each row execute function public.guard_volunteer_insert();

-- ============================================================
-- 2. Campaign validation + budget invariant
-- ============================================================

create or replace function public.validate_campaign()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.start_date is not null and new.end_date is not null and new.end_date < new.start_date then
    raise exception 'END_DATE_BEFORE_START';
  end if;
  if new.total_budget is null or new.total_budget < 0 then
    raise exception 'BUDGET_NEGATIVE';
  end if;
  return new;
end;
$$;
create trigger campaigns_validate before insert or update on public.campaigns
  for each row execute function public.validate_campaign();

-- remaining_budget is always total_budget - sum(allocations); it can never go negative
create or replace function public.sync_campaign_budget()
returns trigger language plpgsql security definer set search_path = public as $$
declare allocated numeric;
begin
  select coalesce(sum(amount), 0) into allocated
  from public.fund_allocations where campaign_id = new.id;
  if new.total_budget - allocated < 0 then
    raise exception 'TOTAL_BELOW_ALLOCATED';
  end if;
  new.remaining_budget := new.total_budget - allocated;
  return new;
end;
$$;
create trigger campaigns_sync_budget before insert or update on public.campaigns
  for each row execute function public.sync_campaign_budget();

-- re-sync a campaign's remaining budget after any allocation change
create or replace function public.resync_campaign_budget()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.campaigns set total_budget = total_budget
  where id = coalesce(new.campaign_id, old.campaign_id);
  return coalesce(new, old);
end;
$$;
create trigger fund_allocations_resync after insert or update or delete on public.fund_allocations
  for each row execute function public.resync_campaign_budget();

-- ============================================================
-- 3. Fund allocation guards (spec §12)
-- ============================================================

create or replace function public.validate_fund_allocation()
returns trigger language plpgsql security definer set search_path = public as $$
declare remaining numeric;
begin
  if new.amount is null or new.amount <= 0 then
    raise exception 'FUND_AMOUNT_POSITIVE';
  end if;
  select remaining_budget into remaining from public.campaigns where id = new.campaign_id;
  if new.amount > remaining then
    raise exception 'FUND_EXCEEDS_REMAINING';
  end if;
  return new;
end;
$$;
create trigger fund_allocations_validate before insert on public.fund_allocations
  for each row execute function public.validate_fund_allocation();

create or replace function public.guard_fund_allocation_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.amount is distinct from old.amount then
    raise exception 'FUND_AMOUNT_IMMUTABLE';
  end if;
  if new.member_id is distinct from old.member_id
     or new.campaign_id is distinct from old.campaign_id then
    raise exception 'FUND_TARGET_IMMUTABLE';
  end if;
  if old.status = 'paid' and new.status = 'pending' then
    raise exception 'FUND_ALREADY_PAID';
  end if;
  return new;
end;
$$;
create trigger fund_allocations_guard before update on public.fund_allocations
  for each row execute function public.guard_fund_allocation_update();

-- ============================================================
-- 4. Application + campaign invite rules (spec §12)
-- ============================================================

create or replace function public.validate_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare c_type text; has_accepted_invite boolean;
begin
  select type into c_type from public.campaigns where id = new.campaign_id;
  -- invite-only campaigns are joined through campaign_invites, not open applications
  if c_type = 'invite' then
    select exists (
      select 1 from public.campaign_invites ci
      where ci.campaign_id = new.campaign_id
        and ci.volunteer_id = new.volunteer_id
        and ci.status = 'accepted'
    ) into has_accepted_invite;
    if not has_accepted_invite then
      raise exception 'APPLICATION_REQUIRES_INVITE';
    end if;
  end if;
  if exists (
    select 1 from public.applications a
    where a.volunteer_id = new.volunteer_id
      and a.campaign_id = new.campaign_id
      and a.status in ('pending','accepted')
      and (TG_OP = 'UPDATE' or a.id <> new.id)
  ) then
    raise exception 'DUPLICATE_APPLICATION';
  end if;
  return new;
end;
$$;
create trigger applications_validate before insert or update on public.applications
  for each row execute function public.validate_application();

create or replace function public.validate_campaign_invite()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    if not exists (select 1 from public.campaigns c where c.id = new.campaign_id and c.type = 'invite') then
      raise exception 'INVITE_ONLY_CAMPAIGN';
    end if;
    if not exists (
      select 1 from public.profiles p
      where p.id = new.volunteer_id and p.role = 'volunteer' and p.suspended = false
    ) then
      raise exception 'INVITE_TARGET_MUST_BE_VOLUNTEER';
    end if;
    if exists (
      select 1 from public.campaign_invites ci
      where ci.campaign_id = new.campaign_id
        and ci.volunteer_id = new.volunteer_id
        and ci.status = 'pending'
        and ci.id <> new.id
    ) then
      raise exception 'DUPLICATE_INVITE';
    end if;
  end if;
  return new;
end;
$$;
create trigger campaign_invites_validate before insert on public.campaign_invites
  for each row execute function public.validate_campaign_invite();

create or replace function public.guard_campaign_invite_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.campaign_id is distinct from old.campaign_id
     or new.volunteer_id is distinct from old.volunteer_id
     or new.invited_by is distinct from old.invited_by then
    raise exception 'INVITE_TARGET_IMMUTABLE';
  end if;
  if new.status is distinct from old.status then
    if old.status <> 'pending' then
      raise exception 'INVITE_ALREADY_ANSWERED';
    end if;
    if new.status not in ('accepted','declined') then
      raise exception 'INVITE_STATUS_INVALID';
    end if;
  end if;
  return new;
end;
$$;
create trigger campaign_invites_guard before update on public.campaign_invites
  for each row execute function public.guard_campaign_invite_update();

-- ============================================================
-- 5. Team membership rules (spec §7 team_members)
-- ============================================================

create or replace function public.validate_team_member()
returns trigger language plpgsql security definer set search_path = public as $$
declare c_id uuid; c_type text;
begin
  select campaign_id into c_id from public.teams where id = new.team_id;
  if c_id is null then
    raise exception 'TEAM_NOT_FOUND';
  end if;
  if new.member_type = 'staff' then
    if not exists (
      select 1 from public.ngo_staff s
      join public.campaigns c on c.ngo_id = s.ngo_id
      where c.id = c_id and s.profile_id = new.user_id and s.status = 'active'
    ) then
      raise exception 'STAFF_MUST_BE_ACTIVE_FOR_NGO';
    end if;
  else
    select type into c_type from public.campaigns where id = c_id;
    if not exists (
      select 1 from public.applications a
      where a.campaign_id = c_id and a.volunteer_id = new.user_id and a.status = 'accepted'
    ) and not exists (
      select 1 from public.campaign_invites ci
      where ci.campaign_id = c_id and ci.volunteer_id = new.user_id and ci.status = 'accepted'
    ) then
      raise exception 'VOLUNTEER_MUST_BE_ACCEPTED';
    end if;
  end if;
  return new;
end;
$$;
create trigger team_members_validate before insert on public.team_members
  for each row execute function public.validate_team_member();

create or replace function public.guard_team_member_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare c_status text;
begin
  if new.team_id is distinct from old.team_id
     or new.user_id is distinct from old.user_id
     or new.member_type is distinct from old.member_type then
    raise exception 'TEAM_MEMBER_IMMUTABLE';
  end if;
  if new.hours_logged is distinct from old.hours_logged then
    if new.hours_logged < 0 then
      raise exception 'HOURS_NEGATIVE';
    end if;
    select c.status into c_status
    from public.campaigns c join public.teams t on t.campaign_id = c.id
    where t.id = new.team_id;
    if c_status is null or c_status <> 'completed' then
      raise exception 'HOURS_ONLY_AFTER_COMPLETION';
    end if;
  end if;
  return new;
end;
$$;
create trigger team_members_guard before update on public.team_members
  for each row execute function public.guard_team_member_update();

-- ============================================================
-- 6. Chat room member must already be on the campaign team
--    (the campaign's NGO owner may be added as a member too)
-- ============================================================

create or replace function public.validate_room_member()
returns trigger language plpgsql security definer set search_path = public as $$
declare c_id uuid;
begin
  select campaign_id into c_id from public.chat_rooms where id = new.room_id;
  if c_id is null then
    raise exception 'ROOM_NOT_FOUND';
  end if;
  if not public.is_campaign_team_member_of(c_id, new.user_id)
     and not exists (select 1 from public.campaigns where id = c_id and ngo_id = new.user_id) then
    raise exception 'ROOM_MEMBER_MUST_BE_ON_TEAM';
  end if;
  return new;
end;
$$;

create or replace function public.is_campaign_team_member_of(p_campaign_id uuid, p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.teams t
    join public.team_members tm on tm.team_id = t.id
    where t.campaign_id = p_campaign_id and tm.user_id = p_user_id
  );
$$;

create trigger chat_room_members_validate before insert on public.chat_room_members
  for each row execute function public.validate_room_member();

-- ============================================================
-- 7. Rating eligibility + avg_rating maintenance (spec §12 / DoD)
-- ============================================================

create or replace function public.validate_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare c_status text;
begin
  if new.from_user_id = new.to_user_id then
    raise exception 'NO_SELF_RATING';
  end if;
  if new.score is null or new.score not between 1 and 5 then
    raise exception 'RATING_SCORE_RANGE';
  end if;
  select status into c_status from public.campaigns where id = new.campaign_id;
  if c_status is null or c_status <> 'completed' then
    raise exception 'RATING_REQUIRES_COMPLETED_CAMPAIGN';
  end if;
  if not public.is_campaign_team_member_of(new.campaign_id, new.from_user_id)
     or not public.is_campaign_team_member_of(new.campaign_id, new.to_user_id) then
    raise exception 'RATING_REQUIRES_SHARED_TEAM';
  end if;
  if exists (
    select 1 from public.ratings r
    where r.campaign_id = new.campaign_id
      and r.from_user_id = new.from_user_id
      and r.to_user_id = new.to_user_id
      and (TG_OP = 'UPDATE' or r.id <> new.id)
  ) then
    raise exception 'RATING_ALREADY_GIVEN';
  end if;
  return new;
end;
$$;
create trigger ratings_validate before insert or update on public.ratings
  for each row execute function public.validate_rating();

create or replace function public.recompute_avg_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare avg_score numeric; target_role text; uid uuid;
begin
  uid := coalesce(new.to_user_id, old.to_user_id);
  select role into target_role from public.profiles where id = uid;
  select round(avg(score), 2) into avg_score from public.ratings where to_user_id = uid;
  if target_role = 'ngo' then
    update public.ngos set avg_rating = coalesce(avg_score, 0) where profile_id = uid;
  elsif target_role = 'volunteer' then
    update public.volunteers set avg_rating = coalesce(avg_score, 0) where profile_id = uid;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger ratings_recompute_avg after insert or delete on public.ratings
  for each row execute function public.recompute_avg_rating();

-- ============================================================
-- 8. Notification triggers — the 7 spec events (spec §18 step 11)
-- ============================================================

-- (1) application status change → notify the volunteer
create or replace function public.notify_on_application_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare c_title text;
begin
  if new.status is distinct from old.status and new.status in ('accepted','rejected') then
    select title into c_title from public.campaigns where id = new.campaign_id;
    perform public.notify_user(
      new.volunteer_id, 'application_status',
      'Your application for "' || coalesce(c_title, 'a campaign') || '" was ' || new.status || '.'
    );
  end if;
  return new;
end;
$$;
create trigger applications_notify after update on public.applications
  for each row execute function public.notify_on_application_status();

-- (2) campaign invite → notify the invited volunteer
create or replace function public.notify_on_campaign_invite()
returns trigger language plpgsql security definer set search_path = public as $$
declare c_title text;
begin
  select title into c_title from public.campaigns where id = new.campaign_id;
  perform public.notify_user(
    new.volunteer_id, 'campaign_invite',
    'You have been invited to join "' || coalesce(c_title, 'a campaign') || '".'
  );
  return new;
end;
$$;
create trigger campaign_invites_notify after insert on public.campaign_invites
  for each row execute function public.notify_on_campaign_invite();

-- (3) team assignment → notify the new member
create or replace function public.notify_on_team_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
declare c_title text;
begin
  select c.title into c_title
  from public.campaigns c join public.teams t on t.campaign_id = c.id
  where t.id = new.team_id;
  perform public.notify_user(
    new.user_id, 'team_assignment',
    'You have been added to the team for "' || coalesce(c_title, 'a campaign') || '".'
  );
  return new;
end;
$$;
create trigger team_members_notify after insert on public.team_members
  for each row execute function public.notify_on_team_assignment();

-- (4) fund allocation → notify the allocated member
create or replace function public.notify_on_fund_allocation()
returns trigger language plpgsql security definer set search_path = public as $$
declare c_title text;
begin
  if TG_OP = 'INSERT' then
    select title into c_title from public.campaigns where id = new.campaign_id;
    perform public.notify_user(
      new.member_id, 'fund_allocation',
      'A fund allocation of Rs. ' || new.amount || ' was recorded for you in "' || coalesce(c_title, 'a campaign') || '".'
    );
  elsif TG_OP = 'UPDATE' and new.status = 'paid' and old.status = 'pending' then
    select title into c_title from public.campaigns where id = new.campaign_id;
    perform public.notify_user(
      new.member_id, 'fund_paid',
      'Your fund allocation of Rs. ' || new.amount || ' has been marked paid.'
    );
  end if;
  return coalesce(new, old);
end;
$$;
create trigger fund_allocations_notify after insert or update on public.fund_allocations
  for each row execute function public.notify_on_fund_allocation();

-- (5) new chat message → notify the room's other members and the campaign owner
create or replace function public.notify_on_message()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare r_name text; c_id uuid; owner uuid;
begin
  select name, campaign_id into r_name, c_id from public.chat_rooms where id = new.room_id;
  select ngo_id into owner from public.campaigns where id = c_id;
  -- other room members
  perform public.notify_user(m.user_id, 'chat_message', 'New message in "' || r_name || '".')
  from public.chat_room_members m
  where m.room_id = new.room_id and m.user_id <> new.sender_id;
  -- campaign owner if they are not a room member and not the sender
  if owner is not null and owner <> new.sender_id
     and not exists (
       select 1 from public.chat_room_members m
       where m.room_id = new.room_id and m.user_id = owner
     ) then
    perform public.notify_user(owner, 'chat_message', 'New message in "' || r_name || '".');
  end if;
  return new;
end;
$$;
create trigger messages_notify after insert on public.messages
  for each row execute function public.notify_on_message();

-- (6a) NGO approval/rejection → notify the NGO
create or replace function public.notify_on_ngo_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.verification_status is distinct from old.verification_status
     and new.verification_status in ('approved','rejected') then
    perform public.notify_user(
      new.profile_id, 'ngo_verification',
      'Your NGO "' || new.org_name || '" was ' || new.verification_status || '.'
    );
  end if;
  return new;
end;
$$;
create trigger ngos_notify after update on public.ngos
  for each row execute function public.notify_on_ngo_verification();

-- (6b) volunteer verification → notify the volunteer
create or replace function public.notify_on_volunteer_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.verification_status is distinct from old.verification_status
     and new.verification_status in ('approved','rejected') then
    perform public.notify_user(
      new.profile_id, 'volunteer_verification',
      'Your volunteer verification was ' || new.verification_status || '.'
    );
  end if;
  return new;
end;
$$;
create trigger volunteers_notify after update on public.volunteers
  for each row execute function public.notify_on_volunteer_verification();

-- (7) staff invite → notify the invitee when the email already has an account
create or replace function public.notify_on_staff_invite()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare invitee uuid;
begin
  select id into invitee from auth.users where lower(email) = lower(new.invited_email);
  if invitee is not null then
    perform public.notify_user(
      invitee, 'staff_invite',
      'You have been invited to join an NGO on Sanjivani as a staff member.'
    );
  end if;
  return new;
end;
$$;
create trigger ngo_staff_notify after insert on public.ngo_staff
  for each row execute function public.notify_on_staff_invite();

-- staff invite claimed → notify the NGO
create or replace function public.notify_on_staff_claim()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.profile_id is not null and old.profile_id is null then
    perform public.notify_user(
      new.ngo_id, 'staff_claimed',
      coalesce(new.invited_name, new.invited_email) || ' has claimed their staff invite.'
    );
  end if;
  return new;
end;
$$;
create trigger ngo_staff_claim_notify after update on public.ngo_staff
  for each row execute function public.notify_on_staff_claim();
