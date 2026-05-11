-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------
-- 1. TABLES
-- -----------------------------------------------------

-- Create Projects Table
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  director text default '',
  dp text default '',
  company_logo_url text,
  created_at timestamptz default now() not null
);

-- Create Shots Table
create table if not exists public.shots (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade not null,
  shot_no text not null,
  scene_no text not null,
  shot_size text default '',
  lens text default '',
  movement text default '',
  angle text default '',
  framing text default '',
  description text default '',
  thumbnail_url text,
  created_at timestamptz default now() not null
);

-- -----------------------------------------------------
-- 2. INDEXES (for performance optimization)
-- -----------------------------------------------------

-- Index on user_id for faster dashboard loading
create index if not exists idx_projects_user_id on public.projects(user_id);

-- Index on project_id for faster shotlist loading
create index if not exists idx_shots_project_id on public.shots(project_id);

-- Index on scene_no for sorting/grouping optimizations
create index if not exists idx_shots_scene_no on public.shots(scene_no);

-- -----------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------

-- Enable RLS
alter table public.projects enable row level security;
alter table public.shots enable row level security;

-- Projects Policies
create policy "Users can view their own projects"
  on public.projects for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own projects"
  on public.projects for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own projects"
  on public.projects for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own projects"
  on public.projects for delete
  using ( auth.uid() = user_id );

-- Shots Policies
create policy "Users can view shots of their own projects"
  on public.shots for select
  using ( exists (
    select 1 from public.projects
    where projects.id = shots.project_id
    and projects.user_id = auth.uid()
  ));

create policy "Users can insert shots to their own projects"
  on public.shots for insert
  with check ( exists (
    select 1 from public.projects
    where projects.id = project_id
    and projects.user_id = auth.uid()
  ));

create policy "Users can update shots of their own projects"
  on public.shots for update
  using ( exists (
    select 1 from public.projects
    where projects.id = shots.project_id
    and projects.user_id = auth.uid()
  ));

create policy "Users can delete shots of their own projects"
  on public.shots for delete
  using ( exists (
    select 1 from public.projects
    where projects.id = shots.project_id
    and projects.user_id = auth.uid()
  ));

-- -----------------------------------------------------
-- 4. STORAGE BUCKETS & POLICIES
-- -----------------------------------------------------

-- Insert buckets if they don't exist
insert into storage.buckets (id, name, public)
values 
  ('logos', 'logos', true),
  ('storyboards', 'storyboards', true)
on conflict (id) do update set public = true;

-- Storage RLS Policies for Logos (Public read, Authenticated users can upload/update/delete)
create policy "Public Access Logos" on storage.objects for select using ( bucket_id = 'logos' );
create policy "Auth Insert Logos" on storage.objects for insert with check ( bucket_id = 'logos' and auth.role() = 'authenticated' );
create policy "Auth Update Logos" on storage.objects for update using ( bucket_id = 'logos' and auth.role() = 'authenticated' );
create policy "Auth Delete Logos" on storage.objects for delete using ( bucket_id = 'logos' and auth.role() = 'authenticated' );

-- Storage RLS Policies for Storyboards (Public read, Authenticated users can upload/update/delete)
create policy "Public Access Storyboards" on storage.objects for select using ( bucket_id = 'storyboards' );
create policy "Auth Insert Storyboards" on storage.objects for insert with check ( bucket_id = 'storyboards' and auth.role() = 'authenticated' );
create policy "Auth Update Storyboards" on storage.objects for update using ( bucket_id = 'storyboards' and auth.role() = 'authenticated' );
create policy "Auth Delete Storyboards" on storage.objects for delete using ( bucket_id = 'storyboards' and auth.role() = 'authenticated' );
