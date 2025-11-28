-- Migration: Create support_requests table
-- This table stores client support requests

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  subject text not null,
  message text not null,
  created_at timestamptz default now(),
  status text check (status in ('OPEN','CLOSED')) default 'OPEN'
);

create index if not exists idx_support_requests_client_id
  on public.support_requests(client_id);

create index if not exists idx_support_requests_user_id
  on public.support_requests(user_id);

create index if not exists idx_support_requests_status
  on public.support_requests(status);

-- Enable RLS
alter table public.support_requests enable row level security;

-- Policy: Clients can view their own support requests
create policy "Clients can view their own support requests"
  on public.support_requests
  for select
  using (
    user_id = auth.uid() or
    client_id in (
      select client_id from public.profiles
      where user_id = auth.uid()
    )
  );

-- Policy: Clients can create their own support requests
create policy "Clients can create their own support requests"
  on public.support_requests
  for insert
  with check (
    user_id = auth.uid() or
    client_id in (
      select client_id from public.profiles
      where user_id = auth.uid()
    )
  );

-- Policy: Admins can view all support requests
create policy "Admins can view all support requests"
  on public.support_requests
  for select
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid()
      and role = 'ADMIN'
    )
  );

