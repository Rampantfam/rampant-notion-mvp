-- Run in Supabase SQL Editor to create the 'projects' table
-- This matches the schema expected by the API route

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
    'REQUEST_RECEIVED','CONFIRMED','IN_PRODUCTION','POST_PRODUCTION','FINAL_REVIEW','COMPLETED'
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

-- Optional: Add index for faster queries
create index if not exists idx_projects_client_id on public.projects(client_id);
create index if not exists idx_projects_status on public.projects(status);

-- Note: RLS policies should be configured separately if needed
-- The API uses service role key, so RLS may not be required for admin operations

