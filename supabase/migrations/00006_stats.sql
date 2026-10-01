-- Sanjivani — aggregate helpers used by dashboards

-- Total hours a volunteer has across all campaign teams (feeds the
-- volunteer history/statistics, spec DoD "hours_logged sum").
create or replace function public.volunteer_total_hours(p_volunteer_id uuid)
returns numeric
language sql stable security definer set search_path = public
as $$
  select coalesce(sum(hours_logged), 0)
  from public.team_members
  where user_id = p_volunteer_id;
$$;

grant execute on function public.volunteer_total_hours(uuid) to authenticated;
