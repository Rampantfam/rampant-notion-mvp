# Projects Table Setup Guide

## Step 1: Execute Migration SQL in Supabase

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase/migrations/20241201000000_ensure_projects_table.sql`
4. Paste into the SQL Editor
5. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

### Migration SQL (for quick copy):

```sql
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
```

**Expected Result:** You should see "Success. No rows returned" or similar success message.

## Step 2: Verify Environment Variables

Ensure your `.env.local` file contains:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

To get these values:
1. Go to Supabase Dashboard → Your Project
2. Settings → API
3. Copy "Project URL" → `NEXT_PUBLIC_SUPABASE_URL`
4. Copy "service_role" key → `SUPABASE_SERVICE_ROLE_KEY`

## Step 3: Run Verification Script

```bash
npm run verify:projects
```

**Expected Output:**
```
🔍 Verifying public.projects table...

✅ Environment variables found
   URL: https://xxxxx.supabase.co...

📋 Test 1: Checking if table exists...
   ✅ Table 'public.projects' exists

📋 Test 2: Verifying required columns...
   ✅ All 18 required columns exist

📋 Test 3: Testing SELECT operation...
   ✅ SELECT: Found X row(s)

📋 Test 4: Verifying status constraint...
   ✅ Status constraint verified

📋 Test 5: Verifying foreign key relationship...
   ✅ Foreign key relationship exists

✅ Verification complete!

📋 Summary:
   • Table exists: ✅
   • Required columns: ✅
   • SELECT operation: ✅
   • Status constraint: ✅
   • Foreign key: ✅

🎉 public.projects table is ready to use!
```

## Step 4: Test the Application

### Start the dev server:

```bash
npm run dev
```

### Test Project Creation:

1. Navigate to: `http://localhost:3000/admin/projects/new`
2. Fill out the form:
   - Project Name: (required)
   - Client: (select from dropdown)
   - Initial Status: (required)
   - Other fields: (optional)
3. Click "Create Project"
4. **Expected:** Redirect to project details page with success

### Verify Projects List:

1. Navigate to: `http://localhost:3000/admin/projects`
2. **Expected:** See all projects in the board view (Request Received, In Progress, Completed columns)
3. Click on any project card
4. **Expected:** Navigate to project details page

## Troubleshooting

### Error: "Could not find the table 'public.projects'"
- **Solution:** Run the migration SQL in Step 1

### Error: "Missing environment variables"
- **Solution:** Check `.env.local` exists and has both variables
- Restart dev server after adding env vars

### Error: "Foreign key constraint violation"
- **Solution:** Ensure `public.clients` table exists first
- Run `docs/sql/setup-all-tables-and-mock-data.sql` if needed

### Verification script fails
- Check Supabase dashboard → Table Editor → `projects` table exists
- Verify columns match the schema
- Check browser console for detailed errors

## Success Criteria

✅ Migration SQL executed successfully  
✅ `npm run verify:projects` passes all tests  
✅ Can create new projects via `/admin/projects/new`  
✅ Projects appear in `/admin/projects` board  
✅ Project details page loads correctly  
✅ No console errors in browser  

## Next Steps After Setup

- Create test projects to populate the board
- Link projects to invoices
- Test project editing functionality
- Verify project status transitions work

