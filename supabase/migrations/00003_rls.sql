-- Sanjivani — Row Level Security (spec §9)
-- Enable RLS on every table
alter table public.profiles enable row level security;
alter table public.ngos enable row level security;
alter table public.volunteers enable row level security;
alter table public.volunteer_reports enable row level security;
alter table public.ngo_staff enable row level security;
alter table public.campaigns enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.applications enable row level security;
alter table public.campaign_invites enable row level security;
alter table public.fund_allocations enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.ratings enable row level security;

-- ============ profiles ============
-- public display names/avatars for all users
create policy "profiles_select_all" on public.profiles
  for select to authenticated, anon using (true);
-- self-signup as ngo or volunteer (staff/admin rows only via service role)
create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (
    id = auth.uid() and role in ('ngo','volunteer')
  );
-- users update their own row; admins can update any (suspension/role handled by triggers)
create policy "profiles_update_self" on public.profiles
  for update to authenticated using (
    (id = auth.uid() and public.not_suspended()) or public.is_admin()
  ) with check ((id = auth.uid()) or public.is_admin());

-- ============ ngos ============
create policy "ngos_select" on public.ngos
  for select to authenticated, anon using (
    verification_status = 'approved'
    or profile_id = auth.uid()
    or public.is_admin()
  );
create policy "ngos_insert_self" on public.ngos
  for insert to authenticated with check (profile_id = auth.uid() and public.not_suspended());
create policy "ngos_update_owner_or_admin" on public.ngos
  for update to authenticated using (
    (profile_id = auth.uid() and public.not_suspended()) or public.is_admin()
  ) with check ((profile_id = auth.uid()) or public.is_admin());

-- ============ volunteers ============
create policy "volunteers_select_all" on public.volunteers
  for select to authenticated, anon using (true);
create policy "volunteers_insert_self" on public.volunteers
  for insert to authenticated with check (profile_id = auth.uid() and public.not_suspended());
create policy "volunteers_update_owner_or_admin" on public.volunteers
  for update to authenticated using (
    (profile_id = auth.uid() and public.not_suspended()) or public.is_admin()
  ) with check ((profile_id = auth.uid()) or public.is_admin());

-- ============ volunteer_reports ============
-- NGO can report a volunteer who was on one of their campaign teams
create policy "volunteer_reports_insert_ngo" on public.volunteer_reports
  for insert to authenticated with check (
    reported_by = auth.uid()
    and public.not_suspended()
    and exists (
      select 1 from public.campaigns c
      join public.teams t on t.campaign_id = c.id
      join public.team_members tm on tm.team_id = t.id
      where c.id = campaign_id
        and c.ngo_id = auth.uid()
        and tm.user_id = volunteer_id
    )
  );
create policy "volunteer_reports_select" on public.volunteer_reports
  for select to authenticated using (
    reported_by = auth.uid() or public.is_admin()
  );
create policy "volunteer_reports_update_admin" on public.volunteer_reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============ ngo_staff ============
create policy "ngo_staff_select" on public.ngo_staff
  for select to authenticated using (
    ngo_id = auth.uid()
    or profile_id = auth.uid()
    or invited_email = public.current_user_email()
    or public.is_admin()
  );
create policy "ngo_staff_insert_owner" on public.ngo_staff
  for insert to authenticated with check (ngo_id = auth.uid() and public.not_suspended());
create policy "ngo_staff_update_owner" on public.ngo_staff
  for update to authenticated using (
    (ngo_id = auth.uid() and public.not_suspended()) or public.is_admin()
  ) with check (ngo_id = auth.uid() or public.is_admin());
create policy "ngo_staff_delete_owner" on public.ngo_staff
  for delete to authenticated using (
    (ngo_id = auth.uid() and public.not_suspended()) or public.is_admin()
  );

-- ============ campaigns ============
-- public campaigns of approved NGOs, invite campaigns for invitees, own campaigns,
-- plus campaign team members (staff/volunteers assigned to it)
create policy "campaigns_select" on public.campaigns
  for select to authenticated, anon using (
    public.is_admin()
    or ngo_id = auth.uid()
    or (
      type = 'public'
      and exists (
        select 1 from public.ngos n
        where n.profile_id = campaigns.ngo_id and n.verification_status = 'approved'
      )
    )
    or (
      type = 'invite'
      and exists (
        select 1 from public.campaign_invites ci
        where ci.campaign_id = campaigns.id and ci.volunteer_id = auth.uid()
      )
    )
    or public.is_campaign_team_member(campaigns.id)
  );
-- only approved NGOs can create campaigns
create policy "campaigns_insert_approved_ngo" on public.campaigns
  for insert to authenticated with check (
    ngo_id = auth.uid()
    and public.not_suspended()
    and exists (
      select 1 from public.ngos n
      where n.profile_id = auth.uid() and n.verification_status = 'approved'
    )
  );
create policy "campaigns_update_owner_or_admin" on public.campaigns
  for update to authenticated using (
    (ngo_id = auth.uid() and public.not_suspended()) or public.is_admin()
  ) with check ((ngo_id = auth.uid()) or public.is_admin());
create policy "campaigns_delete_owner_or_admin" on public.campaigns
  for delete to authenticated using (
    (ngo_id = auth.uid() and public.not_suspended()) or public.is_admin()
  );

-- ============ teams ============
create policy "teams_select" on public.teams
  for select to authenticated using (
    public.owns_campaign(teams.campaign_id)
    or public.is_team_member(teams.id)
    or public.is_admin()
  );
create policy "teams_insert_owner" on public.teams
  for insert to authenticated with check (
    public.owns_campaign(teams.campaign_id) and public.not_suspended()
  );
create policy "teams_update_owner" on public.teams
  for update to authenticated using (
    public.owns_campaign(teams.campaign_id) and public.not_suspended()
  );
create policy "teams_delete_owner" on public.teams
  for delete to authenticated using (
    public.owns_campaign(teams.campaign_id) and public.not_suspended()
  );

-- ============ team_members ============
-- visible to the campaign's NGO owner and to members of the same team
create policy "team_members_select" on public.team_members
  for select to authenticated using (
    user_id = auth.uid()
    or public.is_team_member(team_members.team_id)
    or public.owns_campaign((select t.campaign_id from public.teams t where t.id = team_members.team_id))
    or public.is_admin()
  );
create policy "team_members_insert_owner" on public.team_members
  for insert to authenticated with check (
    public.owns_campaign((select t.campaign_id from public.teams t where t.id = team_id))
    and public.not_suspended()
  );
create policy "team_members_update_owner" on public.team_members
  for update to authenticated using (
    public.owns_campaign((select t.campaign_id from public.teams t where t.id = team_members.team_id))
    and public.not_suspended()
  );
create policy "team_members_delete_owner" on public.team_members
  for delete to authenticated using (
    public.owns_campaign((select t.campaign_id from public.teams t where t.id = team_members.team_id))
    and public.not_suspended()
  );

-- ============ applications ============
create policy "applications_select" on public.applications
  for select to authenticated using (
    volunteer_id = auth.uid()
    or public.owns_campaign(applications.campaign_id)
    or public.is_admin()
  );
create policy "applications_insert_volunteer" on public.applications
  for insert to authenticated with check (
    volunteer_id = auth.uid() and public.not_suspended()
  );
create policy "applications_update_owner" on public.applications
  for update to authenticated using (
    public.owns_campaign(applications.campaign_id) or public.is_admin()
  );

-- ============ campaign_invites ============
create policy "campaign_invites_select" on public.campaign_invites
  for select to authenticated using (
    volunteer_id = auth.uid()
    or public.owns_campaign(campaign_invites.campaign_id)
    or public.is_admin()
  );
create policy "campaign_invites_insert_owner" on public.campaign_invites
  for insert to authenticated with check (
    invited_by = auth.uid()
    and public.owns_campaign(campaign_id)
    and public.not_suspended()
  );
-- invited volunteer can update status only (guard trigger restricts which transitions)
create policy "campaign_invites_update_volunteer" on public.campaign_invites
  for update to authenticated using (
    volunteer_id = auth.uid() and public.not_suspended()
  ) with check (volunteer_id = auth.uid());
create policy "campaign_invites_delete_owner" on public.campaign_invites
  for delete to authenticated using (
    public.owns_campaign(campaign_invites.campaign_id) and public.not_suspended()
  );

-- ============ fund_allocations ============
-- readable by the campaign's NGO owner and the allocated member
create policy "fund_allocations_select" on public.fund_allocations
  for select to authenticated using (
    member_id = auth.uid()
    or public.owns_campaign(fund_allocations.campaign_id)
    or public.is_admin()
  );
create policy "fund_allocations_insert_owner" on public.fund_allocations
  for insert to authenticated with check (
    public.owns_campaign(campaign_id) and public.not_suspended()
  );
create policy "fund_allocations_update_owner" on public.fund_allocations
  for update to authenticated using (
    public.owns_campaign(fund_allocations.campaign_id) and public.not_suspended()
  );
create policy "fund_allocations_delete_owner" on public.fund_allocations
  for delete to authenticated using (
    public.owns_campaign(fund_allocations.campaign_id) and public.not_suspended()
  );

-- ============ chat_rooms ============
create policy "chat_rooms_select" on public.chat_rooms
  for select to authenticated using (
    public.is_room_member(chat_rooms.id)
    or public.owns_campaign(chat_rooms.campaign_id)
    or public.is_admin()
  );
create policy "chat_rooms_insert_owner" on public.chat_rooms
  for insert to authenticated with check (
    public.owns_campaign(campaign_id) and public.not_suspended()
  );
create policy "chat_rooms_update_owner" on public.chat_rooms
  for update to authenticated using (
    public.owns_campaign(chat_rooms.campaign_id) and public.not_suspended()
  );
create policy "chat_rooms_delete_owner" on public.chat_rooms
  for delete to authenticated using (
    public.owns_campaign(chat_rooms.campaign_id) and public.not_suspended()
  );

-- ============ chat_room_members ============
-- visible to the NGO owner and to that room's members
create policy "chat_room_members_select" on public.chat_room_members
  for select to authenticated using (
    public.is_room_member(chat_room_members.room_id)
    or public.is_admin()
    or exists (
      select 1 from public.chat_rooms r
      where r.id = chat_room_members.room_id and public.owns_campaign(r.campaign_id)
    )
  );
create policy "chat_room_members_insert_owner" on public.chat_room_members
  for insert to authenticated with check (
    exists (
      select 1 from public.chat_rooms r
      where r.id = room_id and public.owns_campaign(r.campaign_id)
    )
    and public.not_suspended()
  );
create policy "chat_room_members_delete_owner" on public.chat_room_members
  for delete to authenticated using (
    exists (
      select 1 from public.chat_rooms r
      where r.id = chat_room_members.room_id and public.owns_campaign(r.campaign_id)
    )
    and public.not_suspended()
  );

-- ============ messages ============
-- readable/writable only by members of the room (the campaign's NGO owner included)
create policy "messages_select" on public.messages
  for select to authenticated using (
    public.is_room_member(messages.room_id)
    or public.is_admin()
    or exists (
      select 1 from public.chat_rooms r
      where r.id = messages.room_id and public.owns_campaign(r.campaign_id)
    )
  );
create policy "messages_insert_member" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and public.not_suspended()
    and (
      public.is_room_member(room_id)
      or exists (
        select 1 from public.chat_rooms r
        where r.id = room_id and public.owns_campaign(r.campaign_id)
      )
    )
  );
create policy "messages_delete_sender_or_owner" on public.messages
  for delete to authenticated using (
    sender_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.chat_rooms r
      where r.id = messages.room_id and public.owns_campaign(r.campaign_id)
    )
  );

-- ============ notifications ============
-- readable/writable only by the owner; inserts happen server-side
-- (SECURITY DEFINER triggers / service role) — no insert policy here.
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- ============ ratings ============
-- public trust signal
create policy "ratings_select_all" on public.ratings
  for select to authenticated, anon using (true);
-- eligibility (completed campaign, shared team, no self/duplicate rating) enforced by trigger
create policy "ratings_insert_team" on public.ratings
  for insert to authenticated with check (
    from_user_id = auth.uid()
    and public.not_suspended()
  );
