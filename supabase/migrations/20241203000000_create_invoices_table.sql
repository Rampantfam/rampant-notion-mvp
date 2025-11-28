-- Migration: Create invoices table
-- This migration creates an invoices table for tracking client invoices

-- Create invoices table
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  invoice_id text not null unique,
  amount decimal(10, 2) not null,
  status text check (status in (
    'PAID',
    'UNPAID',
    'OVERDUE'
  )) not null default 'UNPAID',
  due_date date not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  invoice_url text,
  notes text
);

-- Create indexes
create index if not exists idx_invoices_client_id on public.invoices(client_id);
create index if not exists idx_invoices_project_id on public.invoices(project_id);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_invoices_due_date on public.invoices(due_date);
create index if not exists idx_invoices_invoice_id on public.invoices(invoice_id);

-- Add updated_at trigger
create trigger update_invoices_updated_at
  before update on public.invoices
  for each row
  execute function update_updated_at_column();

-- Add RLS policies
alter table public.invoices enable row level security;

-- Policy: Clients can only view their own invoices
create policy "Clients can view their own invoices"
  on public.invoices
  for select
  using (
    client_id in (
      select client_id from public.profiles
      where user_id = auth.uid()
    )
  );

-- Policy: Admins can view all invoices
create policy "Admins can view all invoices"
  on public.invoices
  for select
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid()
      and role = 'ADMIN'
    )
  );

-- Policy: Admins can insert invoices
create policy "Admins can insert invoices"
  on public.invoices
  for insert
  with check (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid()
      and role = 'ADMIN'
    )
  );

-- Policy: Admins can update invoices
create policy "Admins can update invoices"
  on public.invoices
  for update
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid()
      and role = 'ADMIN'
    )
  );

-- Policy: Admins can delete invoices
create policy "Admins can delete invoices"
  on public.invoices
  for delete
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid()
      and role = 'ADMIN'
    )
  );

