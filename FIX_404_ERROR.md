# Fix for 404 Error on Project Details Page

## Issue
Getting a 404 error when clicking on a project, likely because the database migration hasn't been run yet.

## Root Cause
The code is trying to query `slack_channel` column and `project_deliverables` table that don't exist yet because the migration hasn't been applied.

## Fixes Applied

### 1. Made `slack_channel` query resilient
- Removed `slack_channel` from the main query
- Added separate query to fetch `slack_channel` with error handling
- If column doesn't exist, it gracefully returns `null`

### 2. Made DeliverablesSection resilient
- Updated `fetchDeliverables()` to handle missing table gracefully
- Returns empty array if table doesn't exist
- Updated API endpoint to return empty array instead of error when table doesn't exist

### 3. Fixed ESLint warning
- Added eslint-disable comment for useEffect dependency

## Next Steps

**IMPORTANT: You need to run the database migration!**

1. **Apply the migration in Supabase:**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Run the migration file: `supabase/migrations/20241202000000_add_deliverables_and_slack.sql`
   - Or use Supabase CLI: `supabase migration up`

2. **The migration will create:**
   - `slack_channel` column in `projects` table
   - `project_deliverables` table
   - `deliverable_notifications` table

3. **After migration:**
   - The 404 error should be resolved
   - Deliverables section will work properly
   - Slack channel functionality will be available

## Testing

After running the migration:
1. Click on a project - should load without 404
2. Deliverables section should appear (empty if no deliverables yet)
3. Admin can add deliverables
4. Client can approve/request changes
5. Slack channel section should work

## Files Modified

- `src/app/app/projects/[id]/page.tsx` - Made slack_channel query resilient
- `src/app/admin/projects/[id]/page.tsx` - Made slack_channel query resilient  
- `src/components/projects/details/DeliverablesSection.tsx` - Made table queries resilient
- `src/app/api/projects/[id]/deliverables/route.ts` - Handle missing table gracefully

The code should now work even if the migration hasn't been run yet, but you'll need to run the migration to get full functionality.

