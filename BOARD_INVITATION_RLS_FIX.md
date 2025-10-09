# Board Invitation RLS Fix

## Problem

When a user tries to view their board invitation, the query returns empty even though the invitation exists in the database. The console shows:

```
[BoardDetail] Query without invitee filter - data: []
[BoardDetail] Query without invitee filter - error: null
```

This indicates that the Row Level Security (RLS) policies on the `board_invitations` table are blocking the query.

## Root Cause

The original RLS policies in `20251001_critical_fixes.sql` try to access the `auth.users` table:

```sql
CREATE POLICY "Users can see their invitations"
  ON board_invitations FOR SELECT
  USING (
    invitee_id = auth.uid()
    OR inviter_id = auth.uid()
    OR invite_email = (SELECT email FROM auth.users WHERE id = auth.uid())  -- ❌ PROBLEM
  );
```

Accessing `auth.users` table in RLS policies requires special permissions that regular users don't have, causing the policy to fail silently and return no results.

## Solution

Remove the `auth.users` table access from the RLS policies. Since we're primarily using `invitee_id` (not `invite_email`), we can simplify the policies:

```sql
CREATE POLICY "Users can see their invitations"
  ON board_invitations FOR SELECT
  USING (
    invitee_id = auth.uid()
    OR inviter_id = auth.uid()
  );
```

## How to Apply the Fix

### Option 1: Supabase Dashboard (Recommended)

1. **Open SQL Editor**:
   - Go to https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/sql/new

2. **Copy and Run the Migration**:
   - Open `supabase/migrations/20251008_fix_board_invitations_rls_v2.sql`
   - Copy the entire contents
   - Paste into the SQL editor
   - Click **RUN** button

3. **Verify the Fix**:
   ```sql
   -- Run this to verify the policies were updated
   SELECT policyname, cmd, qual
   FROM pg_policies
   WHERE tablename = 'board_invitations';
   ```

### Option 2: Supabase CLI (If Configured)

If you have the Supabase CLI linked to your project:

```bash
cd supabase
npx supabase db push
```

This will push all pending migrations including the fix.

## Testing After Fix

1. **Restart Your App** (to clear any cached queries)

2. **Test the Invitation Flow**:
   - Log in as the invitee user
   - Navigate to Notifications
   - Click on a board invitation notification
   - **Expected**: The invitation modal should now appear

3. **Check Console Logs**:
   You should now see:
   ```
   [BoardDetail] Query without invitee filter - data: [{ id: '...', ... }]
   [BoardDetail] Found invitation with status: pending
   [BoardDetail] Setting pending invitation and showing modal
   ```

## Verification SQL

Run this in Supabase SQL Editor to check if the invitation exists and is readable:

```sql
-- Check if the invitation exists in the database
SELECT
  id,
  board_id,
  inviter_id,
  invitee_id,
  status,
  created_at
FROM board_invitations
WHERE id = '592e38d6-978d-4a2d-bdca-faa612881111';

-- Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'board_invitations'
ORDER BY policyname;
```

## Files Created/Modified

### New Files:
- `supabase/migrations/20251008_fix_board_invitations_rls_v2.sql` - The fix migration
- `apply_board_invitations_fix.sh` - Helper script with instructions

### Modified Files:
- `app/notifications/index.tsx` - Added invitation_id to navigation (already fixed)

## What This Fixes

✅ Users can now see invitations where they are the invitee
✅ Users can see invitations they sent (as inviter)
✅ Users can update invitations to accept/decline them
✅ Board invitation modal will appear when clicking notifications
✅ No more silent RLS policy failures

## Related Issues

This fix resolves the issue where:
- Clicking board invitation notifications shows the board but no modal
- Direct queries to board_invitations return empty arrays
- RLS policies fail silently due to auth.users access

## Additional Notes

If you still have issues after applying this fix:

1. **Clear app cache**: Completely close and restart the app
2. **Check auth session**: Ensure the user is properly authenticated
3. **Verify invitation exists**: Use the verification SQL above
4. **Check RLS is enabled**: `SELECT * FROM pg_tables WHERE tablename = 'board_invitations';`
