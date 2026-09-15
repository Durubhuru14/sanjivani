-- Sanjivani — helper functions used by RLS policies and triggers
-- All helpers are SECURITY DEFINER so they bypass RLS internally
-- (avoids recursion) while remaining safe, read-only lookups.

-- True when the caller is a non-suspended admin
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and suspended = false
  );
$$;

-- True when the acting user's profile is not suspended (unknown users are not suspended)
create or replace function public.not_suspended()
returns boolean
language sql stable security definer set search_path = public
as $$
  select not coalesce(
    (select suspended from public.profiles where id = auth.uid()), false
  );
$$;

-- Email of the acting auth user (for staff-invite matching)
create or replace function public.current_user_email()
returns text
language sql stable security definer set search_path = public, auth
as $$
  select email::text from auth.users where id = auth.uid();
$$;

-- True when the campaign belongs to the acting user's NGO
create or replace function public.owns_campaign(p_campaign_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.campaigns
    where id = p_campaign_id and ngo_id = auth.uid()
  );
$$;

-- True when the acting user is a team member of the campaign
create or replace function public.is_campaign_team_member(p_campaign_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.teams t
    join public.team_members tm on tm.team_id = t.id
    where t.campaign_id = p_campaign_id and tm.user_id = auth.uid()
  );
$$;

-- True when the acting user is a member of the given team
create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

-- True when the acting user is a member of the given chat room
create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.chat_room_members
    where room_id = p_room_id and user_id = auth.uid()
  );
$$;

-- Insert a notification row server-side (bypasses RLS, like the service role)
create or replace function public.notify_user(p_user_id uuid, p_type text, p_message text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_user_id is not null then
    insert into public.notifications (user_id, type, message)
    values (p_user_id, p_type, p_message);
  end if;
end;
$$;
