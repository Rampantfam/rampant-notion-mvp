-- Migration: Add budget fields and CANCELLED status to projects
-- This migration adds budget workflow support

-- Add budget-related columns
do $$
begin
  -- Add requested_budget (budget client wants to stay within)
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'projects' 
                 and column_name = 'requested_budget') then
    alter table public.projects add column requested_budget decimal(10, 2);
  end if;

  -- Add budget_status (PENDING, APPROVED, COUNTER_PROPOSED, REJECTED)
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'projects' 
                 and column_name = 'budget_status') then
    alter table public.projects add column budget_status text check (budget_status in (
      'PENDING',
      'APPROVED',
      'COUNTER_PROPOSED',
      'REJECTED'
    ));
  end if;

  -- Add proposed_budget (admin's counter proposal)
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'projects' 
                 and column_name = 'proposed_budget') then
    alter table public.projects add column proposed_budget decimal(10, 2);
  end if;

  -- Add cancelled_at timestamp
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'projects' 
                 and column_name = 'cancelled_at') then
    alter table public.projects add column cancelled_at timestamptz;
  end if;

  -- Add cancelled_by (user_id who cancelled)
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'projects' 
                 and column_name = 'cancelled_by') then
    alter table public.projects add column cancelled_by uuid;
  end if;
end $$;

-- Update status constraint to include CANCELLED
-- Note: We need to drop and recreate the constraint
do $$
begin
  -- Drop existing constraint if it exists
  if exists (
    select 1 from information_schema.table_constraints 
    where constraint_schema = 'public' 
    and table_name = 'projects' 
    and constraint_type = 'CHECK'
    and constraint_name like '%status%'
  ) then
    -- Get constraint name
    declare
      constraint_name text;
    begin
      select constraint_name into constraint_name
      from information_schema.table_constraints
      where table_schema = 'public'
      and table_name = 'projects'
      and constraint_type = 'CHECK'
      and constraint_name like '%status%'
      limit 1;
      
      if constraint_name is not null then
        execute format('alter table public.projects drop constraint if exists %I', constraint_name);
      end if;
    end;
  end if;

  -- Add new constraint with CANCELLED
  alter table public.projects add constraint projects_status_check 
    check (status in (
      'REQUEST_RECEIVED',
      'CONFIRMED',
      'IN_PRODUCTION',
      'POST_PRODUCTION',
      'FINAL_REVIEW',
      'COMPLETED',
      'CANCELLED'
    ));
exception
  when duplicate_object then
    null; -- Constraint already exists
end $$;

-- Create indexes
create index if not exists idx_projects_budget_status on public.projects(budget_status);
create index if not exists idx_projects_cancelled_at on public.projects(cancelled_at);

-- Create project notifications table for budget status changes
create table if not exists public.project_notifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  notification_type text check (notification_type in (
    'BUDGET_PENDING',
    'BUDGET_APPROVED',
    'BUDGET_COUNTER_PROPOSED',
    'BUDGET_REJECTED',
    'BUDGET_COUNTER_ACCEPTED',
    'PROJECT_CANCELLED'
  )) not null,
  message text,
  created_at timestamptz default now(),
  read_at timestamptz
);

create index if not exists idx_project_notifications_project_id on public.project_notifications(project_id);
create index if not exists idx_project_notifications_read on public.project_notifications(read_at);

-- Enable RLS on project_notifications
alter table public.project_notifications enable row level security;

-- Policy: Admins can view all project notifications
create policy "Admins can view all project notifications"
  on public.project_notifications
  for select
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid()
      and role = 'ADMIN'
    )
  );

-- Policy: Clients can view notifications for their projects
create policy "Clients can view their project notifications"
  on public.project_notifications
  for select
  using (
    project_id in (
      select id from public.projects
      where client_id in (
        select client_id from public.profiles
        where user_id = auth.uid()
      )
    )
  );

