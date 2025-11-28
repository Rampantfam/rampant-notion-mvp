-- Migration: Add deliverables table and slack_channel to projects
-- This migration creates a deliverables tracking system

-- Add slack_channel column to projects table
do $$
begin
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'projects' 
                 and column_name = 'slack_channel') then
    alter table public.projects add column slack_channel text;
  end if;
end $$;

-- Create deliverables table
create table if not exists public.project_deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  type text not null default 'Design',
  external_link text,
  upload_date date default current_date,
  status text check (status in (
    'AWAITING_APPROVAL',
    'APPROVED',
    'CHANGES_REQUESTED'
  )) not null default 'AWAITING_APPROVAL',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes
create index if not exists idx_project_deliverables_project_id on public.project_deliverables(project_id);
create index if not exists idx_project_deliverables_status on public.project_deliverables(status);

-- Create notifications table for deliverable status changes
create table if not exists public.deliverable_notifications (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references public.project_deliverables(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  notification_type text check (notification_type in (
    'APPROVED',
    'CHANGES_REQUESTED'
  )) not null,
  message text,
  created_at timestamptz default now(),
  read_at timestamptz
);

-- Create index for notifications
create index if not exists idx_deliverable_notifications_project_id on public.deliverable_notifications(project_id);
create index if not exists idx_deliverable_notifications_read on public.deliverable_notifications(read_at);

-- Add updated_at trigger for deliverables
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_project_deliverables_updated_at
  before update on public.project_deliverables
  for each row
  execute function update_updated_at_column();

