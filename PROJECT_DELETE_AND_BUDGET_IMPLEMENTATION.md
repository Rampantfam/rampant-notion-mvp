# Project Delete and Budget Workflow Implementation

## Summary

This implementation adds two major features:
1. **Client Project Deletion** - Clients can delete their projects with a confirmation warning
2. **Budget-Based Project Workflow** - Clients submit budgets with projects, admins approve/reject/counter-propose, and clients can accept counter proposals

## Files Created

### 1. Database Migration
- **`supabase/migrations/20241204000000_add_budget_and_cancelled_status.sql`**
  - Adds `requested_budget` (decimal) - budget client wants to stay within
  - Adds `budget_status` (PENDING, APPROVED, COUNTER_PROPOSED, REJECTED)
  - Adds `proposed_budget` (decimal) - admin's counter proposal
  - Adds `cancelled_at` and `cancelled_by` for tracking deletions
  - Adds `CANCELLED` to project status enum
  - Creates `project_notifications` table for budget status notifications

### 2. API Routes
- **`src/app/api/projects/[id]/budget/route.ts`** (NEW)
  - Handles budget approval workflow
  - Actions: APPROVE, REJECT, COUNTER_PROPOSE, ACCEPT_COUNTER
  - Creates notifications for each action

## Files Modified

### 1. Project Creation
- **`src/app/app/projects/new/page.tsx`**
  - Added "Requested Budget" field (required)
  - Shows success message about budget pending approval
  - Validates budget is > 0

- **`src/app/api/projects/route.ts`**
  - Handles `requested_budget` in POST request
  - Sets `budget_status = "PENDING"` for new projects
  - Creates notification when budget is pending

### 2. Project Deletion
- **`src/app/api/projects/[id]/route.ts`**
  - Added DELETE method
  - For CLIENT users: Marks project as CANCELLED (soft delete)
  - For ADMIN users: Hard deletes project
  - Creates notification when project is cancelled

- **`src/components/projects/details/ProjectDetails.tsx`**
  - Added Delete button (only visible for clients - `readOnly` mode)
  - Added confirmation modal with warning message
  - Redirects to projects list after deletion

### 3. Budget Status Display
- **`src/components/projects/details/ProjectDetails.tsx`**
  - Added "Budget Status" section (only for clients)
  - Shows requested budget
  - Displays status badges:
    - **PENDING**: Yellow badge with "Budget Pending Approval" message
    - **APPROVED**: Green badge with "Budget Approved" message
    - **COUNTER_PROPOSED**: Blue badge with counter proposal amount and "Accept Counter Proposal" button
    - **REJECTED**: Red badge with rejection message
  - Accept Counter Proposal button calls API to accept

- **`src/app/app/projects/[id]/page.tsx`**
  - Fetches budget fields (`requested_budget`, `budget_status`, `proposed_budget`)
  - Passes budget data to ProjectDetails component
  - Updated `normalizeStatus` to include CANCELLED

- **`src/components/projects/details/ProjectDetails.tsx`**
  - Updated `ProjectLike` type to include budget fields
  - Added CANCELLED to status type

## Workflow

### Project Creation with Budget
1. Client fills out project request form including **Requested Budget** (required)
2. Project is created with `status = "REQUEST_RECEIVED"` and `budget_status = "PENDING"`
3. Notification is created: "Your project request has been submitted. Your budget of $X is pending approval."
4. Client sees success message: "Project request submitted successfully! Your budget is pending approval."

### Budget Approval Workflow
1. **Admin Approves Budget**:
   - Sets `budget_status = "APPROVED"`
   - Sets `status = "CONFIRMED"`
   - Creates notification: "Your budget request of $X has been approved. The project is now confirmed."

2. **Admin Rejects Budget**:
   - Sets `budget_status = "REJECTED"`
   - Creates notification: "Your budget request of $X has been rejected. Please contact us to discuss."

3. **Admin Counter Proposes**:
   - Sets `budget_status = "COUNTER_PROPOSED"`
   - Sets `proposed_budget = [admin's amount]`
   - Creates notification: "We've sent you a counter proposal of $X for this project. Please review and accept or contact us to discuss."

4. **Client Accepts Counter Proposal**:
   - Sets `budget_status = "APPROVED"`
   - Updates `requested_budget = proposed_budget`
   - Sets `status = "CONFIRMED"`
   - Creates notification: "The counter proposal has been accepted. The project is now confirmed with a budget of $X."

### Project Deletion
1. Client clicks "Delete" button on project details page
2. Confirmation modal appears with warning:
   - "Are you sure you want to delete this project? This project will not be fulfilled by Rampant and will no longer be attended to. The project will appear as cancelled on the admin side."
3. If confirmed:
   - Project `status = "CANCELLED"`
   - `cancelled_at` timestamp set
   - `cancelled_by` set to user ID
   - Notification created: "This project has been cancelled by the client."
   - Client redirected to projects list

## API Endpoints

### DELETE `/api/projects/[id]`
- **Auth**: CLIENT or ADMIN
- **CLIENT**: Soft delete (marks as CANCELLED)
- **ADMIN**: Hard delete
- **Response**: `{ success: true, project: {...} }`

### PUT `/api/projects/[id]/budget`
- **Auth**: ADMIN (for approve/reject/counter) or CLIENT (for accept counter)
- **Body**: 
  ```json
  {
    "action": "APPROVE" | "REJECT" | "COUNTER_PROPOSE" | "ACCEPT_COUNTER",
    "proposed_budget": 15000  // Required for COUNTER_PROPOSE
  }
  ```
- **Response**: `{ success: true, project: {...} }`

## Database Schema Changes

### Projects Table
```sql
requested_budget decimal(10, 2)  -- Budget client wants to stay within
budget_status text check (budget_status in ('PENDING', 'APPROVED', 'COUNTER_PROPOSED', 'REJECTED'))
proposed_budget decimal(10, 2)  -- Admin's counter proposal
cancelled_at timestamptz         -- When project was cancelled
cancelled_by uuid                -- User who cancelled
status text check (status in (..., 'CANCELLED'))  -- Added CANCELLED status
```

### Project Notifications Table
```sql
id uuid primary key
project_id uuid references projects(id)
notification_type text check (notification_type in (
  'BUDGET_PENDING',
  'BUDGET_APPROVED',
  'BUDGET_COUNTER_PROPOSED',
  'BUDGET_REJECTED',
  'BUDGET_COUNTER_ACCEPTED',
  'PROJECT_CANCELLED'
))
message text
created_at timestamptz
read_at timestamptz
```

## UI Components

### Budget Status Section (Client View)
- Shows requested budget amount
- Color-coded status badges:
  - **Yellow**: Pending
  - **Green**: Approved
  - **Blue**: Counter Proposed (with accept button)
  - **Red**: Rejected
- Accept Counter Proposal button (only when status is COUNTER_PROPOSED)

### Delete Confirmation Modal
- Warning message about project cancellation
- Cancel and Delete buttons
- Loading state during deletion

## Testing Checklist

- [ ] Create project with budget
- [ ] Verify budget status shows as "Pending"
- [ ] Verify notification is created
- [ ] Test delete project with confirmation
- [ ] Verify project status changes to CANCELLED
- [ ] Test admin budget approval
- [ ] Test admin budget rejection
- [ ] Test admin counter proposal
- [ ] Test client accepting counter proposal
- [ ] Verify notifications are created for each action
- [ ] Verify budget status updates correctly

## Next Steps (Admin Interface)

The admin interface for budget management still needs to be created. This would include:
1. Budget status filter on projects list
2. Budget approval/rejection/counter-proposal UI in project details
3. Budget amount input for counter proposals
4. Notification display for admins

## Status

✅ **COMPLETE** for client-side features:
- Project deletion with confirmation
- Budget field in project creation
- Budget status display
- Accept counter proposal functionality
- Notifications system

⏳ **PENDING** for admin-side features:
- Admin UI for budget approval/rejection/counter-proposal

