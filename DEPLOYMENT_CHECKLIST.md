# Deployment Checklist

This document outlines all manual steps required to deploy the new features.

## ✅ Code Changes Complete

All code changes have been implemented and tested:
- ✅ Edit functionality for planned projects in Budget page
- ✅ Client dashboard refactor with comprehensive metrics
- ✅ All TypeScript types are correct
- ✅ Build compiles successfully
- ✅ Linting warnings fixed

---

## 🔧 REQUIRED: SQL Migrations

You **MUST** run these SQL migrations in your Supabase SQL Editor in the following order:

### 1. Budget Fields and Cancelled Status Migration
**File:** `supabase/migrations/20241204000000_add_budget_and_cancelled_status.sql`

**What it does:**
- Adds `requested_budget`, `budget_status`, `proposed_budget` columns to `projects` table
- Adds `cancelled_at` and `cancelled_by` columns to `projects` table
- Updates `projects` status constraint to include `CANCELLED`
- Creates `project_notifications` table
- Sets up RLS policies for notifications

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of `supabase/migrations/20241204000000_add_budget_and_cancelled_status.sql`
3. Paste into SQL Editor
4. Click "Run"

**Verification:**
After running, verify these columns exist:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name IN ('requested_budget', 'budget_status', 'proposed_budget', 'cancelled_at', 'cancelled_by');
```

### 2. Annual Budget Migration
**File:** `supabase/migrations/20241205000000_add_annual_budget_to_clients.sql`

**What it does:**
- Adds `annual_budget` column to `clients` table

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of `supabase/migrations/20241205000000_add_annual_budget_to_clients.sql`
3. Paste into SQL Editor
4. Click "Run"

**Verification:**
After running, verify the column exists:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name = 'annual_budget';
```

---

## ⚠️ IMPORTANT NOTES

### Migration Safety
- Both migrations are **idempotent** (safe to run multiple times)
- They check if columns/tables exist before creating them
- If a column already exists, it will skip that step

### Feature Availability
**Before migrations:**
- Budget page will work but budget won't persist (shows error when saving)
- Project creation will work but budget fields won't be saved
- Dashboard will work but some metrics may be incomplete

**After migrations:**
- All features work fully
- Budget persists to database
- Project budget workflow works
- Dashboard shows complete metrics

### RLS Policies
The migrations include Row Level Security (RLS) policies for:
- `project_notifications` table (admins can see all, clients see only their projects)

If you have custom RLS policies, review them to ensure they don't conflict.

---

## 🧪 Testing Checklist

After running migrations, test these features:

### Budget Page
- [ ] Navigate to `/app/budget`
- [ ] Edit annual budget and save - should persist after refresh
- [ ] Add a planned project via calculator
- [ ] Edit a planned project (click edit icon, modify fields, save)
- [ ] Delete a planned project
- [ ] Verify "Spend Breakdown by Month" shows correct data

### Dashboard
- [ ] Navigate to `/app` (Overview)
- [ ] Verify all 6 summary cards show correct counts
- [ ] Check "Projects Snapshot" shows recent projects
- [ ] Check "Billing Snapshot" shows recent invoices
- [ ] Verify "Recent Activity" shows notifications (if any exist)
- [ ] Test with empty data (should show zeros and empty states)

### Project Creation
- [ ] Create a new project with requested budget
- [ ] Verify project is created with `budget_status = 'PENDING'`
- [ ] Check notification is created (if `project_notifications` table exists)

### Project Deletion
- [ ] Delete a project as a client
- [ ] Verify project status changes to `CANCELLED`
- [ ] Verify cancelled projects don't appear in budget calculations
- [ ] Verify cancelled badge shows on project details page

---

## 🐛 Known Issues (Pre-existing)

These are **NOT** related to the new features:

1. **Invite Page Error:** The `/invite/accept` page has a pre-existing error about dynamic server usage. This doesn't affect the new features.

2. **Invoice ID Column:** Some queries handle missing `invoice_id` column gracefully. If you see warnings in logs, they're expected until all migrations are run.

---

## 📋 Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 🚀 Deployment Steps

1. **Run SQL Migrations** (see above)
2. **Deploy Code** (push to your deployment platform)
3. **Verify Build** - Ensure `npm run build` succeeds
4. **Test Features** - Use the testing checklist above
5. **Monitor Logs** - Check for any errors in production

---

## 📞 Support

If you encounter issues:
1. Check Supabase logs for SQL errors
2. Verify all migrations ran successfully
3. Check browser console for client-side errors
4. Review server logs for API errors

All code is resilient to missing columns/tables, so features will degrade gracefully if migrations aren't run yet.

