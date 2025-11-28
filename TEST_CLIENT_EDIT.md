# Client Project Edit Functionality - Test Checklist

## Changes Made

### 1. API Authorization (`src/app/api/projects/[id]/route.ts`)
- ✅ Added `getUserContext()` function to get user role and client ID
- ✅ Added authorization check: Clients can only edit their own projects
- ✅ Added restrictions: Clients cannot change:
  - `client_id` (project ownership)
  - `status` (project status)
  - `account_manager_*` fields (account managers)

### 2. UI Updates (`src/components/projects/details/ProjectDetails.tsx`)
- ✅ Edit button now shows for both admin and client users
- ✅ Edit modal hides fields clients shouldn't edit:
  - Client selector (hidden when `readOnly={true}`)
  - Account Managers editor (hidden when `readOnly={true}`)
- ✅ `saveChanges()` function excludes restricted fields when `readOnly={true}`
- ✅ Updated header to show status badge next to Edit button (matching design)
- ✅ Removed duplicate status badge from Key Project Information section
- ✅ Optimized client loading: Only loads clients list when not `readOnly`

## Test Scenarios

### Test 1: Client Can Edit Their Own Project
1. Log in as a CLIENT user
2. Navigate to a project that belongs to your client
3. Click "Edit" button
4. Verify:
   - ✅ Edit modal opens
   - ✅ Client selector is NOT visible
   - ✅ Account Managers editor is NOT visible
   - ✅ Can edit: Title, Event Date, Event Time, Location, Service Type, Deliverables, Notes
5. Make changes and click "Save"
6. Verify:
   - ✅ Changes are saved successfully
   - ✅ Page refreshes with updated data

### Test 2: Client Cannot Edit Other Client's Project
1. Log in as a CLIENT user
2. Try to access/edit a project that belongs to a different client
3. Verify:
   - ✅ API returns 403 Forbidden
   - ✅ Error message: "Forbidden: You can only edit your own projects"

### Test 3: Client Cannot Change Restricted Fields
1. Log in as a CLIENT user
2. Open browser DevTools Network tab
3. Try to manually send a PUT request with restricted fields:
   - `client_id` (different value)
   - `status` (different value)
   - `account_manager_*` fields
4. Verify:
   - ✅ API returns 403 Forbidden with appropriate error message

### Test 4: Admin Can Edit All Fields
1. Log in as an ADMIN user
2. Navigate to any project
3. Click "Edit" button
4. Verify:
   - ✅ Edit modal opens
   - ✅ Client selector IS visible
   - ✅ Account Managers editor IS visible
   - ✅ Can edit all fields including status
5. Make changes and save
6. Verify:
   - ✅ All changes are saved successfully

### Test 5: UI Matches Design
1. Navigate to project details page
2. Verify:
   - ✅ Header shows: "Projects > [Project Title]" breadcrumb
   - ✅ "Project Details" as main heading
   - ✅ Status badge shown in top right (next to Edit button)
   - ✅ Edit button is orange and visible
   - ✅ Status badge is NOT duplicated in Key Project Information section

## Manual Verification Steps

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Test as Client:**
   - Log in with a CLIENT account
   - Navigate to `/app/projects/[project-id]` where the project belongs to your client
   - Click "Edit" and verify the modal shows only editable fields
   - Make a change (e.g., update Event Date)
   - Click "Save" and verify the change persists

3. **Test as Admin:**
   - Log in with an ADMIN account
   - Navigate to `/admin/projects/[project-id]`
   - Click "Edit" and verify all fields are visible
   - Make changes and verify they save correctly

4. **Test Authorization:**
   - As a CLIENT, try to edit a project that doesn't belong to your client
   - Verify you get a 403 error (check browser console/network tab)

## Expected Behavior Summary

- ✅ Clients can edit: Title, Event Date, Event Time, Location, Service Type, Deliverables, Notes
- ✅ Clients CANNOT edit: Client (ownership), Status, Account Managers
- ✅ Admins can edit all fields
- ✅ UI matches the design with status badge in header
- ✅ Edit button works for both clients and admins
