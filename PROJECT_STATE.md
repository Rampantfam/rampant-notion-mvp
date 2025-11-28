# Rampant Client Portal - Project State Summary

**Last Updated:** December 2024  
**Repository:** https://github.com/Rampantfam/rampant-notion-mvp

---

## 🎯 Project Overview

This is a Next.js 14 + Supabase client portal application with:
- **Client Portal** - For clients to manage projects, invoices, budget, and settings
- **Admin Portal** - For Rampant team to manage clients, projects, and invoices
- **Team Portal** - For team members

---

## ✅ Recently Implemented Features

### 1. Budget Page (`/app/budget`)
- **Location:** `src/app/app/budget/page.tsx` + `src/components/budget/BudgetClient.tsx`
- **Features:**
  - Annual budget tracking (persisted to `clients.annual_budget`)
  - Quick budget calculator
  - Planned projects management (local state + DB projects)
  - Spend breakdown by month (from PAID invoices)
  - Edit/delete planned projects (inline editing)
  - Projects tabs: Planned vs Completed

### 2. Client Dashboard Refactor (`/app`)
- **Location:** `src/app/app/page.tsx` + `src/lib/dashboard.ts`
- **Features:**
  - 6 summary cards: Active Projects, Project Requests, Completed Projects, Pending Deliverables, Invoices Due, Remaining Budget
  - Projects Snapshot (3-5 recent projects)
  - Billing Snapshot (3 recent invoices)
  - Recent Activity feed (from `project_notifications`)
- **Important:** Active Projects only counts `CONFIRMED` and beyond (not `REQUEST_RECEIVED`)

### 3. Client Settings Page (`/app/settings`)
- **Location:** `src/app/app/settings/page.tsx` + `src/components/settings/ClientSettingsPage.tsx`
- **Features:**
  - Account Information (Full Name, Organization Name, Email - all editable)
  - Change Password modal
  - Notification Preferences (3 toggles)
  - Help & Support (Quick Links + Contact Support form)
- **API Routes:**
  - `PUT /api/client-settings` - Save account info and notification prefs
  - `POST /api/client-support` - Submit support requests

### 4. Project Deletion (Client Side)
- **Location:** `src/app/api/projects/[id]/route.ts` (DELETE method)
- **Behavior:**
  - Clients can "delete" projects (soft delete to `CANCELLED` status)
  - Multi-stage fallback: tries `CANCELLED` status, falls back to notes marker if constraint doesn't allow it
  - Creates notification when cancelled
  - Cancelled projects excluded from budget calculations

### 5. Budget Workflow in Project Creation
- **Location:** `src/app/app/projects/new/page.tsx` + `src/app/api/projects/route.ts`
- **Features:**
  - Clients specify "Requested Budget" when creating projects
  - Projects start with `budget_status = 'PENDING'`
  - Admin can approve/reject/counter-propose via `/api/projects/[id]/budget`
  - Notifications sent for budget status changes

---

## 🗄️ Database Schema

### Key Tables

**`public.profiles`**
- `user_id`, `role`, `client_id`, `full_name`, `email`
- **New columns:** `receive_email_updates`, `notify_on_deliverables`, `notify_on_invoice_due` (all boolean, default true)

**`public.clients`**
- `id`, `name`, `email`, `phone`, `logo_url`, `slack_url`
- **New column:** `annual_budget` (decimal(10,2))

**`public.projects`**
- Standard fields: `id`, `title`, `client_id`, `status`, `event_date`, etc.
- **New columns:**
  - `requested_budget` (decimal(10,2))
  - `budget_status` (text: 'PENDING', 'APPROVED', 'REJECTED', 'COUNTER_PROPOSED')
  - `proposed_budget` (decimal(10,2))
  - `cancelled_at` (timestamptz)
  - `cancelled_by` (uuid)
- **Status values:** `REQUEST_RECEIVED`, `CONFIRMED`, `IN_PRODUCTION`, `POST_PRODUCTION`, `FINAL_REVIEW`, `COMPLETED`, `CANCELLED`

**`public.invoices`**
- `id`, `client_id`, `project_id`, `invoice_number`, `amount`, `status`, `due_date`, `issue_date`, `created_at`
- **Note:** `invoice_id` column may or may not exist (code handles both cases)

**`public.project_notifications`** (NEW)
- `id`, `project_id`, `notification_type`, `message`, `created_at`, `read_at`
- **Types:** `PROJECT_BUDGET_PENDING`, `PROJECT_BUDGET_APPROVED`, `PROJECT_BUDGET_REJECTED`, `PROJECT_BUDGET_COUNTER_PROPOSED`, `PROJECT_BUDGET_COUNTER_ACCEPTED`, `PROJECT_CANCELLED`

**`public.support_requests`** (NEW)
- `id`, `user_id`, `client_id`, `subject`, `message`, `created_at`, `status` ('OPEN' or 'CLOSED')

---

## 📁 Key Files & Their Purposes

### Server Components (Data Fetching)
- `src/app/app/page.tsx` - Client dashboard (uses `getClientDashboardSummary`)
- `src/app/app/budget/page.tsx` - Budget page (fetches invoices, projects, annual_budget)
- `src/app/app/settings/page.tsx` - Settings page (uses `getClientSettings`)

### Client Components (Interactive UI)
- `src/components/budget/BudgetClient.tsx` - Budget page UI with calculator and project management
- `src/components/settings/ClientSettingsPage.tsx` - Settings page UI with forms and modals
- `src/components/projects/ClientProjectsPage.tsx` - Client projects list
- `src/components/projects/details/ProjectDetails.tsx` - Project details with edit/delete

### API Routes
- `src/app/api/projects/[id]/route.ts` - PUT (update), DELETE (soft delete for clients)
- `src/app/api/projects/[id]/budget/route.ts` - Budget approval workflow
- `src/app/api/clients/budget/route.ts` - Update client annual budget
- `src/app/api/client-settings/route.ts` - Update client settings
- `src/app/api/client-support/route.ts` - Submit support requests
- `src/app/api/invoices/route.ts` - Get invoices (resilient to missing `invoice_id` column)

### Helper Functions
- `src/lib/dashboard.ts` - `getClientDashboardSummary()` - Fetches all dashboard metrics
- `src/lib/clientSettings.ts` - `getClientSettings()` - Fetches client settings data
- `src/lib/authServer.ts` - `getUserContext()` - Server-side auth helper
- `src/lib/supabaseAdmin.ts` - `getSupabaseAdmin()` - Admin Supabase client
- `src/lib/format.ts` - `formatCurrency()`, `formatDate()`, `timeAgo()`

### Utilities
- `src/lib/sendEmail.ts` - Email utility (gracefully handles missing Resend package)

---

## 🔧 Required SQL Migrations

**IMPORTANT:** These migrations MUST be run in Supabase SQL Editor in this order:

1. **`supabase/migrations/20241204000000_add_budget_and_cancelled_status.sql`**
   - Adds budget fields to projects
   - Adds CANCELLED status support
   - Creates `project_notifications` table
   - Sets up RLS policies

2. **`supabase/migrations/20241205000000_add_annual_budget_to_clients.sql`**
   - Adds `annual_budget` column to `clients` table

3. **`supabase/migrations/20241206000000_add_notification_prefs_to_profiles.sql`**
   - Adds notification preference columns to `profiles` table

4. **`supabase/migrations/20241206001000_create_support_requests.sql`**
   - Creates `support_requests` table with RLS policies

**All migrations are idempotent** (safe to run multiple times).

---

## 🎨 UI Patterns & Styling

- **Primary Color:** Orange (`bg-orange-500`, `text-orange-600`)
- **Cards:** White background, rounded borders (`rounded-lg border border-neutral-200`)
- **Buttons:** Orange primary buttons, gray secondary buttons
- **Status Badges:** Color-coded pills (green for success, red for cancelled, orange for in-progress, gray for requested)
- **Layout:** Uses `AppShell` component with sidebar navigation

---

## 🔐 Authentication & Authorization

- **Server-side:** Uses `getUserContext()` from `src/lib/authServer.ts`
- **Client-side:** Uses `getSupabaseBrowser()` from `src/lib/supabase.ts`
- **Admin operations:** Uses `getSupabaseAdmin()` for service role access
- **RLS Policies:** Enabled on all tables, clients can only see their own data

---

## ⚠️ Important Notes & Constraints

### Resilient Code Patterns
- **All queries handle missing columns gracefully** - Code checks for column existence and falls back
- **Invoice queries** handle missing `invoice_id` column (uses `id` as fallback)
- **Budget queries** handle missing `annual_budget` column (returns null)
- **Project deletion** has multi-stage fallback for missing `CANCELLED` status support

### Status Definitions
- **Active Projects:** Only `CONFIRMED`, `IN_PRODUCTION`, `POST_PRODUCTION`, `FINAL_REVIEW` (NOT `REQUEST_RECEIVED`)
- **Project Requests:** Only `REQUEST_RECEIVED` status
- **Cancelled Projects:** Either `status = 'CANCELLED'` OR `notes` contains `[CANCELLED` marker

### Email Configuration (Optional)
- Support request emails use `src/lib/sendEmail.ts`
- Requires `RESEND_API_KEY` and `SUPPORT_ADMIN_EMAIL` env vars
- **Works without email** - gracefully logs instead of sending if not configured

### Known Issues (Pre-existing)
- `/invite/accept` page has `useSearchParams()` Suspense boundary warning (non-breaking)
- Fixed: `/api/invites/verify` now has `export const dynamic = "force-dynamic"`

---

## 🧪 Testing Checklist

When testing new features, verify:
- [ ] Budget page loads and saves annual budget
- [ ] Planned projects can be added, edited, and deleted
- [ ] Dashboard shows correct counts (Active Projects excludes REQUEST_RECEIVED)
- [ ] Settings page saves account info and notification prefs
- [ ] Change password modal works
- [ ] Support form submits successfully
- [ ] Project deletion marks as CANCELLED (or in notes)
- [ ] Cancelled projects don't appear in budget calculations
- [ ] Project creation with budget works
- [ ] Budget approval workflow works (admin side)

---

## 📝 Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional (for email):
RESEND_API_KEY=your_resend_key
SUPPORT_ADMIN_EMAIL=support@rampant.com
```

---

## 🚀 Current State

- ✅ All code committed to git
- ✅ Pushed to GitHub: https://github.com/Rampantfam/rampant-notion-mvp
- ✅ Build compiles successfully
- ✅ No linting errors
- ⚠️ **Migrations need to be run** in Supabase for full functionality

---

## 📚 Documentation Files

- `DEPLOYMENT_CHECKLIST.md` - Step-by-step deployment guide
- `CLIENT_SETTINGS_IMPLEMENTATION.md` - Settings page details
- `TESTING_SUMMARY.md` - Test results and status
- `PROJECT_DELETE_AND_BUDGET_IMPLEMENTATION.md` - Budget workflow details

---

## 🔄 Next Steps for New Chat

1. **Read this file first** to understand project state
2. **Check if migrations have been run** - ask user or check Supabase
3. **Review specific feature files** if working on related features
4. **Follow existing patterns** - use shared utilities, maintain type safety
5. **Test thoroughly** - especially edge cases and missing data scenarios

---

**This document should be shared with any new chat session to bring them up to speed quickly.**

