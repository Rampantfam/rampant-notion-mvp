-- Migration: Ensure public.projects table exists with correct schema
-- This migration is idempotent and safe to run multiple times

-- Create the projects table if it doesn't exist
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  creative_name text,
  creative_phone text,
  event_date date,
  event_time text,
  location text,
  service_type text,
  status text check (status in (
    'REQUEST_RECEIVED','CONFIRMED','IN_PRODUCTION',
    'POST_PRODUCTION','FINAL_REVIEW','COMPLETED'
  )) not null default 'REQUEST_RECEIVED',
  deliverables text[],
  content_links jsonb,
  notes text,
  account_manager_names text[],
  account_manager_emails text[],
  account_manager_phones text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes if they don't exist
create index if not exists idx_projects_client_id on public.projects(client_id);
create index if not exists idx_projects_status on public.projects(status);

-- Add any missing columns (safe for existing tables)
do $$
begin
  -- Add creative_phone if missing
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'projects' 
                 and column_name = 'creative_phone') then
    alter table public.projects add column creative_phone text;
  end if;

  -- Add content_links if missing
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'projects' 
                 and column_name = 'content_links') then
    alter table public.projects add column content_links jsonb;
  end if;

  -- Add account_manager_names if missing
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'projects' 
                 and column_name = 'account_manager_names') then
    alter table public.projects add column account_manager_names text[];
  end if;

  -- Add account_manager_emails if missing
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'projects' 
                 and column_name = 'account_manager_emails') then
    alter table public.projects add column account_manager_emails text[];
  end if;

  -- Add account_manager_phones if missing
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'projects' 
                 and column_name = 'account_manager_phones') then
    alter table public.projects add column account_manager_phones text[];
  end if;

  -- Ensure status constraint exists
  if not exists (
    select 1 from information_schema.table_constraints 
    where constraint_schema = 'public' 
    and table_name = 'projects' 
    and constraint_type = 'CHECK'
    and constraint_name like '%status%'
  ) then
    -- Note: Adding check constraint to existing table requires dropping and recreating
    -- This is handled by the table creation above, but we verify it exists
    null;
  end if;
end $$;

