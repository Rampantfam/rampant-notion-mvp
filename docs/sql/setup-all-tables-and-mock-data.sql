-- ============================================================================
-- Complete Database Setup Script for Rampant Notion MVP
-- ============================================================================
-- Run this entire script in Supabase SQL Editor to create all tables
-- and insert mock data for testing
-- ============================================================================

-- ============================================================================
-- 1. CREATE CLIENTS TABLE
-- ============================================================================

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  logo_url text,
  slack_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_clients_email on public.clients(email);

-- ============================================================================
-- 2. CREATE PROJECTS TABLE
-- ============================================================================

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

create index if not exists idx_projects_client_id on public.projects(client_id);
create index if not exists idx_projects_status on public.projects(status);

-- ============================================================================
-- 3. CREATE INVOICES TABLE
-- ============================================================================

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  amount numeric(12,2) default 0,
  status text check (status in ('UNPAID','PAID','PAST_DUE')) not null default 'UNPAID',
  issue_date date,
  due_date date,
  bill_to text,
  line_items jsonb,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_invoices_client_id on public.invoices(client_id);
create index if not exists idx_invoices_project_id on public.invoices(project_id);
create index if not exists idx_invoices_status on public.invoices(status);

-- ============================================================================
-- 4. INSERT MOCK CLIENTS
-- ============================================================================

-- Insert clients (using specific UUIDs for consistency with mock data)
insert into public.clients (id, name, email, phone, logo_url, created_at) values
  ('550e8400-e29b-41d4-a716-446655440001', 'TechCorp Inc.', 'sarah@techcorp.com', '(555) 123-4567', null, '2024-09-01 10:00:00+00'),
  ('550e8400-e29b-41d4-a716-446655440002', 'StartupXYZ', 'contact@startupxyz.com', '(555) 234-5678', null, '2024-09-15 10:00:00+00'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Global Enterprises', 'info@globalenterprises.com', '(555) 345-6789', null, '2024-08-20 10:00:00+00'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Sarah & Mike Johnson', 'sarah.mike@email.com', '(555) 456-7890', null, '2024-11-01 10:00:00+00'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Nova Fashion', 'hello@novafashion.com', '(555) 567-8901', null, '2024-11-10 10:00:00+00'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Startupty', 'info@startupty.com', '(555) 678-9012', null, '2024-10-15 10:00:00+00'),
  ('550e8400-e29b-41d4-a716-446655440007', 'Bella Vista Bistro', 'contact@bellavista.com', '(555) 789-0123', null, '2024-10-20 10:00:00+00'),
  ('550e8400-e29b-41d4-a716-446655440008', 'Fresh Mart', 'info@freshmart.com', '(555) 890-1234', null, '2024-09-25 10:00:00+00'),
  ('550e8400-e29b-41d4-a716-446655440009', 'GreenFinance', 'contact@greenfinance.com', '(555) 901-2345', null, '2024-09-30 10:00:00+00'),
  ('550e8400-e29b-41d4-a716-446655440010', 'City Chamber', 'info@citychamber.org', '(555) 012-3456', null, '2024-10-05 10:00:00+00'),
  ('550e8400-e29b-41d4-a716-446655440011', 'Studio Create', 'hello@studiocreate.com', '(555) 123-4568', null, '2024-10-10 10:00:00+00')
on conflict (id) do nothing;

-- ============================================================================
-- 5. INSERT MOCK PROJECTS
-- ============================================================================

-- Insert projects with proper client relationships
insert into public.projects (id, client_id, title, creative_name, event_date, event_time, location, service_type, status, deliverables, notes, created_at) values
  -- Request Received projects
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'Wedding Photography', 'Alex Chen', '2024-12-15', '2:00 PM - 11:00 PM', 'Grand Ballroom, Downtown Hotel', 'Wedding Photography & Video', 'REQUEST_RECEIVED', ARRAY['Photography', 'Video Highlights', 'Photo Album Design'], 'Client requested extra coverage during cocktail hour. Drone shots approved for outdoor ceremony.', '2024-12-01 10:00:00+00'),
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Corporate Event', 'Sarah Wilson', '2024-12-20', '9:00 AM - 5:00 PM', 'Convention Center', 'Event Photography', 'REQUEST_RECEIVED', ARRAY['Event Photography', 'Social Media Content'], 'Annual corporate gathering with 200+ attendees.', '2024-12-05 10:00:00+00'),
  ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', 'Brand Photoshoot', 'Mike Johnson', '2025-01-05', '10:00 AM - 4:00 PM', 'Studio Location', 'Brand Photography', 'REQUEST_RECEIVED', ARRAY['Product Photography', 'Lifestyle Images'], 'Spring collection photoshoot for marketing materials.', '2024-12-10 10:00:00+00'),
  
  -- In Progress projects
  ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440006', 'Product Launch Video', 'Emma Rodriguez', '2024-11-13', '9:00 AM - 6:00 PM', 'Product Studio', 'Video Production', 'IN_PRODUCTION', ARRAY['Product Video', 'Behind-the-Scenes', 'Social Media Clips'], 'Product launch video for new tech product. Multiple angles and slow-motion shots required.', '2024-11-01 10:00:00+00'),
  ('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', 'Restaurant Menu Design', 'David Kim', '2024-12-09', null, null, 'Graphic Design', 'IN_PRODUCTION', ARRAY['Menu Design', 'Digital Menu', 'Print Files'], 'Complete redesign of restaurant menu with new seasonal items.', '2024-11-15 10:00:00+00'),
  ('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', 'Website Redesign', 'Alex Chen', '2024-10-15', null, null, 'Web Development', 'IN_PRODUCTION', ARRAY['UI/UX Design', 'Frontend Development', 'Backend Integration'], 'Complete redesign of the corporate marketing website with modern UI/UX and improved conversion flows.', '2024-10-01 10:00:00+00'),
  ('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440002', 'Mobile App Development', 'Sarah Wilson', '2024-10-01', null, null, 'Mobile Development', 'IN_PRODUCTION', ARRAY['iOS App', 'Android App', 'Backend API'], 'Full-stack mobile application development for iOS and Android platforms with real-time synchronization.', '2024-09-20 10:00:00+00'),
  
  -- Completed projects
  ('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440008', 'Holiday Campaign', 'Mike Johnson', '2024-12-01', null, null, 'Marketing Campaign', 'COMPLETED', ARRAY['Social Media Content', 'Email Campaign', 'Print Materials'], 'Holiday marketing campaign with social media and email components.', '2024-11-01 10:00:00+00'),
  ('660e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440009', 'Annual Report Design', 'Emma Rodriguez', '2024-11-25', null, null, 'Graphic Design', 'COMPLETED', ARRAY['Annual Report PDF', 'Print Files', 'Interactive Version'], 'Annual report design with infographics and data visualization.', '2024-10-15 10:00:00+00'),
  ('660e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440010', 'Event Photography', 'David Kim', '2024-11-26', '6:00 PM - 11:00 PM', 'City Hall', 'Event Photography', 'COMPLETED', ARRAY['Event Photos', 'Highlights Video'], 'City chamber annual gala event coverage.', '2024-11-01 10:00:00+00'),
  ('660e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440011', 'Website Redesign', 'Alex Chen', '2024-11-25', null, null, 'Web Development', 'COMPLETED', ARRAY['Website Launch', 'SEO Optimization'], 'Complete website redesign and launch for creative agency.', '2024-10-10 10:00:00+00'),
  ('660e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440003', 'Brand Identity', 'Sarah Wilson', '2024-09-15', null, null, 'Brand Design', 'COMPLETED', ARRAY['Logo Design', 'Brand Guidelines', 'Marketing Materials'], 'Complete brand identity redesign including logo, typography, color system, and comprehensive brand guidelines for global rollout.', '2024-09-01 10:00:00+00')
on conflict (id) do nothing;

-- ============================================================================
-- 6. INSERT MOCK INVOICES
-- ============================================================================

-- Insert invoices with proper client and project relationships
-- Using UUIDs that match the mock data format for seamless integration
insert into public.invoices (id, invoice_number, client_id, project_id, amount, status, issue_date, due_date, bill_to, line_items, notes, created_at, updated_at) values
  (
    '00000000-0000-0000-0000-000000003045',
    '#3045',
    '550e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440006',
    12500.00,
    'PAID',
    '2024-10-31',
    '2024-11-14',
    'TechCorp Inc.
123 Tech Street
San Francisco, CA 94102
United States',
    '[
      {"item": "Website Design", "description": "Design & layout of marketing site", "qty": 1, "rate": 8000, "lineTotal": 8000},
      {"item": "Frontend Development", "description": "Implementation and integration", "qty": 1, "rate": 4500, "lineTotal": 4500}
    ]'::jsonb,
    'Payment due within 14 days. Please remit via ACH using the details on file. Contact accounting@rmpnt.com with any questions.',
    '2024-10-31 10:00:00+00',
    '2024-11-10 10:00:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000003046',
    '#3046',
    '550e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440007',
    25000.00,
    'UNPAID',
    '2024-11-04',
    '2024-12-04',
    'StartupXYZ
456 Innovation Drive
Austin, TX 78701
United States',
    '[
      {"item": "Mobile App Design", "description": "UI/UX design for iOS and Android", "qty": 1, "rate": 12000, "lineTotal": 12000},
      {"item": "Backend Development", "description": "API and database development", "qty": 1, "rate": 8000, "lineTotal": 8000},
      {"item": "Testing & QA", "description": "Comprehensive testing and quality assurance", "qty": 1, "rate": 5000, "lineTotal": 5000}
    ]'::jsonb,
    'Payment due within 30 days. Wire transfer preferred. Please contact finance@startupxyz.com for payment details.',
    '2024-11-04 10:00:00+00',
    '2024-11-04 10:00:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000003047',
    '#3047',
    '550e8400-e29b-41d4-a716-446655440003',
    '660e8400-e29b-41d4-a716-446655440012',
    8750.00,
    'PAID',
    '2024-10-27',
    '2024-11-27',
    'Global Enterprises
789 Corporate Boulevard
New York, NY 10001
United States',
    '[
      {"item": "Brand Identity Design", "description": "Logo, color palette, and brand guidelines", "qty": 1, "rate": 5000, "lineTotal": 5000},
      {"item": "Marketing Materials", "description": "Business cards, letterhead, and digital assets", "qty": 1, "rate": 2500, "lineTotal": 2500},
      {"item": "Brand Guidelines Document", "description": "Comprehensive brand style guide", "qty": 1, "rate": 1250, "lineTotal": 1250}
    ]'::jsonb,
    'Payment received. Thank you for your business! All deliverables have been provided as specified.',
    '2024-10-27 10:00:00+00',
    '2024-11-05 14:30:00+00'
  )
on conflict (id) do nothing;

-- ============================================================================
-- VERIFICATION QUERIES (Optional - run these to verify data was inserted)
-- ============================================================================

-- Uncomment to verify:
-- select count(*) as client_count from public.clients;
-- select count(*) as project_count from public.projects;
-- select count(*) as invoice_count from public.invoices;
-- select * from public.clients order by created_at desc;
-- select * from public.projects order by created_at desc;
-- select * from public.invoices order by created_at desc;

