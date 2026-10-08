-- Sanjivani — admin oversight hardening + end-to-end notification coverage.
--
-- 1. Suspension takes down an NGO's public operation:
--    campaigns_select hides campaigns of suspended NGOs from everyone except
--    admins, the owner, and people already on the campaign team.
-- 2. Applications can only target joinable campaigns (public + approved +
--    non-suspended NGO, or a held accepted invite).
-- 3. The in-app notification surface is completed end to end (beyond the 7
--    spec §18 events): new applications reach the NGO, campaign status
--    changes reach the team, ratings/hours/reports/suspensions reach the
--    people they affect.

-- ============================================================
-- 1. RLS: take-down of a suspended NGO's public operation
-- ============================================================

drop policy "campaigns_select" on public.campaigns;
create policy "campaigns_select" on public.campaigns
  for select to authenticated, anon using (
    public.is_admin()
    or ngo_id = auth.uid()
    or (
      type = 'public'
      and exists (
        select 1 from public.ngos n
        where n.profile_id = campaigns.ngo_id
          and n.verification_status = 'approved'
          and not exists (
            select 1 from public.profiles p
            where p.id = campaigns.ngo_id and p.suspended
          )
      )
    )
    or (
      type = 'invite'
      and exists (
        select 1 from public.campaign_invites ci
        where ci.campaign_id = campaigns.id
          and ci.volunteer_id = auth.uid()
          and not exists (
            select 1 from public.profiles p
            where p.id = campaigns.ngo_id and p.suspended
          )
      )
    )
    or public.is_campaign_team_member(campaigns.id)
  );

-- applications may only target campaigns that are actually joinable:
-- a public campaign of an approved, non-suspended NGO, or an invite the
-- volunteer holds as accepted (invite-only campaigns, spec §12)
drop policy "applications_insert_volunteer" on public.applications;
create policy "applications_insert_volunteer" on public.applications
  for insert to authenticated with check (
    volunteer_id = auth.uid()
    and public.not_suspended()
    and (
      exists (
        select 1 from public.campaigns c
        join public.ngos n on n.profile_id = c.ngo_id
        where c.id = applications.campaign_id
          and c.type = 'public'
          and c.status in ('upcoming', 'ongoing')
          and n.verification_status = 'approved'
          and not exists (
            select 1 from public.profiles p
            where p.id = c.ngo_id and p.suspended
          )
      )
      or exists (
        select 1 from public.campaign_invites ci
        join public.campaigns c on c.id = ci.campaign_id
        join public.ngos n on n.profile_id = c.ngo_id
        where ci.campaign_id = applications.campaign_id
          and ci.volunteer_id = auth.uid()
          and ci.status = 'accepted'
          and n.verification_status = 'approved'
          and not exists (
            select 1 from public.profiles p
            where p.id = c.ngo_id and p.suspended
          )
      )
    )
  );

-- ============================================================
-- 2. Fix rating eligibility: the campaign's NGO owner counts as
--    a rating participant (volunteers rate the NGO, the NGO rates
--    volunteers — bidirectional per spec §16, and neither is ever
--    a team_members row).
-- ============================================================

create or replace function public.validate_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare c_status text; c_owner uuid;
begin
  if new.from_user_id = new.to_user_id then
    raise exception 'NO_SELF_RATING';
  end if;
  if new.score is null or new.score not between 1 and 5 then
    raise exception 'RATING_SCORE_RANGE';
  end if;
  select status, ngo_id into c_status, c_owner from public.campaigns where id = new.campaign_id;
  if c_status is null or c_status <> 'completed' then
    raise exception 'RATING_REQUIRES_COMPLETED_CAMPAIGN';
  end if;
  -- each side must be on the campaign team or be the campaign's NGO owner
  if not (
    (public.is_campaign_team_member_of(new.campaign_id, new.from_user_id) or new.from_user_id = c_owner)
    and (public.is_campaign_team_member_of(new.campaign_id, new.to_user_id) or new.to_user_id = c_owner)
  ) then
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

-- ============================================================
-- 3. Notification triggers — completing the loop for every actor
-- ============================================================

-- (8) new pending application → the campaign's NGO owner
create or replace function public.notify_on_new_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare c_title text; owner uuid;
begin
  if new.status = 'pending' then
    select title, ngo_id into c_title, owner from public.campaigns where id = new.campaign_id;
    if owner is not null then
      perform public.notify_user(
        owner, 'new_application',
        coalesce((select name from public.profiles where id = new.volunteer_id), 'Someone')
          || ' applied to join "' || coalesce(c_title, 'a campaign') || '".'
      );
    end if;
  end if;
  return new;
end;
$$;
create trigger applications_new_notify after insert on public.applications
  for each row execute function public.notify_on_new_application();

-- (9) campaign status change → every team member (completion unlocks ratings + hours)
create or replace function public.notify_on_campaign_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare extra text := '';
begin
  if new.status is distinct from old.status then
    if new.status = 'completed' then
      extra := ' You can now rate your teammates and the NGO.';
    elsif new.status = 'cancelled' then
      extra := ' No further activity can happen on it.';
    end if;
    perform public.notify_user(
      tm.user_id, 'campaign_status',
      '"' || new.title || '" is now ' || new.status || '.' || extra
    )
    from public.teams t
    join public.team_members tm on tm.team_id = t.id
    where t.campaign_id = new.id;
  end if;
  return new;
end;
$$;
create trigger campaigns_status_notify after update on public.campaigns
  for each row execute function public.notify_on_campaign_status();

-- (10) rating received → the rated user
create or replace function public.notify_on_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare c_title text;
begin
  select title into c_title from public.campaigns where id = new.campaign_id;
  perform public.notify_user(
    new.to_user_id, 'rating_received',
    'You received a ' || new.score || '-star rating on "' || coalesce(c_title, 'a campaign') || '".'
  );
  return new;
end;
$$;
create trigger ratings_notify after insert on public.ratings
  for each row execute function public.notify_on_rating();

-- (11) report filed → every admin sees it in the review queue
create or replace function public.notify_on_new_report()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_user(
    p.id, 'volunteer_report',
    'A report was filed against '
      || coalesce((select name from public.profiles where id = new.volunteer_id), 'a volunteer')
      || ' by ' || coalesce((select name from public.profiles where id = new.reported_by), 'an NGO') || '.'
  )
  from public.profiles p
  where p.role = 'admin';
  return new;
end;
$$;
create trigger volunteer_reports_new_notify after insert on public.volunteer_reports
  for each row execute function public.notify_on_new_report();

-- (12) report answered → the reporting NGO learns the outcome
create or replace function public.notify_on_report_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('reviewed','dismissed') then
    perform public.notify_user(
      new.reported_by, 'report_status',
      'Your report against '
        || coalesce((select name from public.profiles where id = new.volunteer_id), 'a volunteer')
        || ' was marked ' || new.status || '.'
    );
  end if;
  return new;
end;
$$;
create trigger volunteer_reports_status_notify after update on public.volunteer_reports
  for each row execute function public.notify_on_report_status();

-- (13) suspension / unsuspension → the affected account (readable again after unsuspend)
create or replace function public.notify_on_suspension()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.suspended is distinct from old.suspended then
    if new.suspended then
      perform public.notify_user(
        new.id, 'account_suspended',
        'Your account was suspended by the platform admin. Your data is preserved — contact support if you think this is a mistake.'
      );
    else
      perform public.notify_user(
        new.id, 'account_unsuspended',
        'Your account was unsuspended — welcome back. All your data is intact.'
      );
    end if;
  end if;
  return new;
end;
$$;
create trigger profiles_suspension_notify after update on public.profiles
  for each row execute function public.notify_on_suspension();

-- (14) hours logged → the volunteer's history grew
create or replace function public.notify_on_hours_logged()
returns trigger language plpgsql security definer set search_path = public as $$
declare c_title text;
begin
  if new.hours_logged is distinct from old.hours_logged then
    select c.title into c_title
    from public.campaigns c join public.teams t on t.campaign_id = c.id
    where t.id = new.team_id;
    perform public.notify_user(
      new.user_id, 'hours_logged',
      new.hours_logged || ' hour' || case when new.hours_logged = 1 then '' else 's' end
        || ' were logged for you on "' || coalesce(c_title, 'a campaign') || '".'
    );
  end if;
  return new;
end;
$$;
create trigger team_members_hours_notify after update on public.team_members
  for each row execute function public.notify_on_hours_logged();

-- (15) removal from a team → the member deserves to know
create or replace function public.notify_on_team_removal()
returns trigger language plpgsql security definer set search_path = public as $$
declare c_title text;
begin
  select c.title into c_title
  from public.campaigns c join public.teams t on t.campaign_id = c.id
  where t.id = old.team_id;
  perform public.notify_user(
    old.user_id, 'team_removed',
    'You were removed from the team for "' || coalesce(c_title, 'a campaign') || '".'
  );
  return old;
end;
$$;
create trigger team_members_removal_notify after delete on public.team_members
  for each row execute function public.notify_on_team_removal();

-- (16) declined campaign invite → the inviting NGO
create or replace function public.notify_on_invite_declined()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status = 'declined' then
    perform public.notify_user(
      new.invited_by, 'invite_declined',
      coalesce((select name from public.profiles where id = new.volunteer_id), 'A volunteer')
        || ' declined the invite to "'
        || coalesce((select title from public.campaigns where id = new.campaign_id), 'a campaign') || '".'
    );
  end if;
  return new;
end;
$$;
create trigger campaign_invites_declined_notify after update on public.campaign_invites
  for each row execute function public.notify_on_invite_declined();
