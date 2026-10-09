-- ============================================================
-- 00008 — oversight hardening (final round)
--
-- (1) RLS gap: applications_update_owner and messages_delete_sender_or_owner
--     were the only owner-write policies without not_suspended(), so a
--     suspended NGO's still-valid JWT could decide applications and delete
--     chat messages via direct API calls (spec §10: writes must be rejected
--     "even if they bypass the UI").
-- (2) Notification symmetry: invite ACCEPTED now notifies the inviting NGO
--     (declined already did) — the NGO's next action (team add) gets a push
--     signal instead of silence.
-- ============================================================

-- (1a) suspended NGOs can no longer decide applications via direct API
drop policy if exists applications_update_owner on public.applications;
create policy "applications_update_owner" on public.applications
  for update to authenticated using (
    (public.owns_campaign(applications.campaign_id) and public.not_suspended())
    or public.is_admin()
  );

-- (1b) suspended accounts can no longer delete chat messages via direct API
drop policy if exists messages_delete_sender_or_owner on public.messages;
create policy "messages_delete_sender_or_owner" on public.messages
  for delete to authenticated using (
    (sender_id = auth.uid() and public.not_suspended())
    or public.is_admin()
    or (
      public.not_suspended()
      and exists (
        select 1 from public.chat_rooms r
        where r.id = messages.room_id and public.owns_campaign(r.campaign_id)
      )
    )
  );

-- (2) invite accepted → the inviting NGO is told, mirroring notify_on_invite_declined
create or replace function public.notify_on_invite_accepted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status = 'accepted' then
    perform public.notify_user(
      new.invited_by, 'invite_accepted',
      coalesce((select name from public.profiles where id = new.volunteer_id), 'A volunteer')
        || ' accepted the invite to "'
        || coalesce((select title from public.campaigns where id = new.campaign_id), 'a campaign') || '".'
    );
  end if;
  return new;
end;
$$;
create trigger campaign_invites_accepted_notify after update on public.campaign_invites
  for each row execute function public.notify_on_invite_accepted();
