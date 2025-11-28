# Database Setup Instructions

This directory contains SQL scripts to set up the database tables and insert mock data for testing.

## Quick Setup

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run the Complete Setup Script**
   - Open `setup-all-tables-and-mock-data.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" or press `Ctrl+Enter` (or `Cmd+Enter` on Mac)

3. **Verify the Data**
   - After running, you can verify the data was inserted by running these queries:
   ```sql
   SELECT COUNT(*) as client_count FROM public.clients;
   SELECT COUNT(*) as project_count FROM public.projects;
   SELECT COUNT(*) as invoice_count FROM public.invoices;
   ```

## What Gets Created

### Tables
- **clients** - 11 mock clients
- **projects** - 12 mock projects (various statuses)
- **invoices** - 3 mock invoices (matching the invoice list page)

### Mock Data Includes

**Clients:**
- TechCorp Inc.
- StartupXYZ
- Global Enterprises
- Sarah & Mike Johnson
- Nova Fashion
- Startupty
- Bella Vista Bistro
- Fresh Mart
- GreenFinance
- City Chamber
- Studio Create

**Projects:**
- Projects in various statuses: REQUEST_RECEIVED, IN_PROGRESS, COMPLETED
- Projects linked to the clients above
- Includes deliverables, notes, dates, and other metadata

**Invoices:**
- Invoice #3045 (TechCorp Inc. - Website Redesign) - PAID
- Invoice #3046 (StartupXYZ - Mobile App Development) - UNPAID
- Invoice #3047 (Global Enterprises - Brand Identity) - PAID

## Individual Table Scripts

If you prefer to set up tables individually:

1. `new-projects-table.sql` - Creates the projects table only
2. `new-invoices-table.sql` - Creates the invoices table only
3. `setup-all-tables-and-mock-data.sql` - Complete setup with all tables and data

## Notes

- The script uses `on conflict (id) do nothing` to prevent errors if run multiple times
- All foreign key relationships are properly set up
- Indexes are created for better query performance
- The invoice IDs match the format expected by the application's mock data fallback

## Troubleshooting

If you encounter errors:

1. **"relation does not exist"** - Make sure you're running the scripts in order (clients → projects → invoices)
2. **"duplicate key value"** - The data may already exist. The script uses `on conflict do nothing` to handle this gracefully
3. **"foreign key constraint"** - Ensure clients are inserted before projects, and projects before invoices

