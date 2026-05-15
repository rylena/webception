insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-media',
  'project-media',
  true,
  20971520,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/avif',
    'image/bmp',
    'image/x-icon',
    'image/vnd.microsoft.icon'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read project media" on storage.objects;
create policy "Users can read project media"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'project-media');

drop policy if exists "Users can upload own project media" on storage.objects;
create policy "Users can upload own project media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'project-media'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update own project media" on storage.objects;
create policy "Users can update own project media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'project-media'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'project-media'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete own project media" on storage.objects;
create policy "Users can delete own project media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'project-media'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
