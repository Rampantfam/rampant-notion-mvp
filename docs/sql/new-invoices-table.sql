-- Run this in Supabase SQL Editor to create the invoices table

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text,              -- e.g. "#3048"
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  amount numeric(12,2) default 0,   -- total amount
  status text check (status in ('UNPAID','PAID','PAST_DUE')) not null default 'UNPAID',
  issue_date date,
  due_date date,
  bill_to text,
  line_items jsonb,                 -- [{item, description, qty, rate, lineTotal}]
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_invoices_client_id on public.invoices(client_id);
create index if not exists idx_invoices_project_id on public.invoices(project_id);
create index if not exists idx_invoices_status on public.invoices(status);

