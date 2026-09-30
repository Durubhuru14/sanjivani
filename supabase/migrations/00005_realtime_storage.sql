-- Sanjivani — realtime publication + storage bucket for uploads

-- Realtime: chat messages and notifications (RLS is enforced per subscriber)
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;

-- Storage: one public-read bucket for avatars, logos, and campaign images.
-- Users can only write inside their own folder; only image types are allowed.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media_read_public" on storage.objects;
create policy "media_read_public" on storage.objects
  for select to authenticated, anon
  using (bucket_id = 'media');

drop policy if exists "media_upload_own_folder" on storage.objects;
create policy "media_upload_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp', 'gif')
  );

drop policy if exists "media_delete_own_folder" on storage.objects;
create policy "media_delete_own_folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Email confirmation is DISABLED for this project (spec §6).
-- Local dev: set [auth] enable_confirmations = false in supabase/config.toml.
-- Hosted: Auth → Providers → Email → "Confirm email" toggle OFF.
