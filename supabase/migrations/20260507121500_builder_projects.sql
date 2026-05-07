create table if not exists public.builder_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled',
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint builder_projects_data_object check (jsonb_typeof(data) = 'object')
);

create index if not exists builder_projects_user_updated_idx
  on public.builder_projects (user_id, updated_at desc);

alter table public.builder_projects enable row level security;

drop policy if exists "Users can read own projects" on public.builder_projects;
create policy "Users can read own projects"
  on public.builder_projects
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own projects" on public.builder_projects;
create policy "Users can create own projects"
  on public.builder_projects
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own projects" on public.builder_projects;
create policy "Users can update own projects"
  on public.builder_projects
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own projects" on public.builder_projects;
create policy "Users can delete own projects"
  on public.builder_projects
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists builder_projects_set_updated_at on public.builder_projects;
create trigger builder_projects_set_updated_at
  before update on public.builder_projects
  for each row
  execute function public.set_updated_at();
