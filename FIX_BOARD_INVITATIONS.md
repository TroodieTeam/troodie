# Board Invitations Fix - Action Plan

## Problem Identified
**Table naming mismatch**: The migration and service used `board_members`, but your database has `board_collaborators`.

## Fixes Applied

### ✅ 1. Updated `boardInvitationService.ts`
Changed line 35 from `board_members` → `board_collaborators`

### ✅ 2. Updated Migration File
Changed `supabase/migrations/20251001_critical_fixes.sql`:
- Line 95: `board_members` → `board_collaborators`
- Line 111: `board_members` → `board_collaborators`

---

## Next Steps (Do These Now)

### Step 1: Re-run the Migration

**Option A: Via Supabase Dashboard (Recommended)**
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire fixed migration file
3. Click "Run"

```bash
# Copy this command to get the migration content:
cat /Users/kndri/projects/troodie/supabase/migrations/20251001_critical_fixes.sql
```

**Option B: Via CLI**
```bash
cd /Users/kndri/projects/troodie
npx supabase db push
```

---

### Step 2: Verify Tables Exist

Run in **Supabase SQL Editor**:

```sql
-- Verify tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('board_invitations', 'board_collaborators', 'notifications')
ORDER BY table_name;
```

**Expected output:**
```
board_collaborators
board_invitations
notifications
```

---

### Step 3: Test the Invitation Flow

#### In the App:

1. **Restart the app**:
   ```bash
   # Kill the current process (Ctrl+C)
   npm start
   ```

2. **As User A (Board Owner)**:
   - Navigate to a board you own
   - Tap "Invite Collaborators" button
   - Enter User B's username (with @ prefix)
   - Tap "Send Invite"
   - **Check for success toast**

3. **Check app console** for any errors:
   ```
   Error sending board invitation: [message]
   ```

4. **If successful**, switch to User B's account

5. **As User B (Invitee)**:
   - Pull down to refresh notifications
   - **Expected**: See board invitation notification
   - Tap notification
   - **Expected**: Navigate to board or invitation acceptance screen

---

### Step 4: Manual Verification in Database

If app test doesn't work, verify in database:

```sql
-- 1. Check if invitation was created
SELECT
  id,
  board_id,
  inviter_id,
  invitee_id,
  status,
  created_at
FROM board_invitations
ORDER BY created_at DESC
LIMIT 5;
```

```sql
-- 2. Check if notification was created
SELECT
  id,
  user_id,
  type,
  title,
  message,
  created_at,
  is_read
FROM notifications
WHERE type = 'board_invite'
ORDER BY created_at DESC
LIMIT 5;
```

```sql
-- 3. Get user IDs for testing
SELECT id, username, email
FROM users
ORDER BY created_at DESC
LIMIT 10;
```

---

### Step 5: Manual Test (If Automated Test Fails)

**Create invitation manually:**

```sql
-- Replace these values:
-- <BOARD_ID> - ID of an existing board
-- <INVITER_USER_ID> - User who owns the board
-- <INVITEE_USER_ID> - User who should receive invitation

-- 1. Create invitation
INSERT INTO board_invitations (
  board_id,
  inviter_id,
  invitee_id,
  status,
  expires_at
)
VALUES (
  '<BOARD_ID>',
  '<INVITER_USER_ID>',
  '<INVITEE_USER_ID>',
  'pending',
  NOW() + INTERVAL '7 days'
)
RETURNING id, board_id, invitee_id, status;

-- 2. Create notification (use invitation ID from above)
INSERT INTO notifications (
  user_id,
  type,
  title,
  message,
  related_id,
  related_type,
  data,
  is_read
)
VALUES (
  '<INVITEE_USER_ID>',
  'board_invite',
  'Board Invitation',
  'You have been invited to collaborate on a board',
  '<BOARD_ID>',
  'board',
  jsonb_build_object('invitation_id', '<INVITATION_ID_FROM_STEP_1>'),
  false
)
RETURNING id, user_id, type, message;

-- 3. Verify invitation was created
SELECT * FROM board_invitations
WHERE invitee_id = '<INVITEE_USER_ID>'
ORDER BY created_at DESC
LIMIT 1;

-- 4. Verify notification was created
SELECT * FROM notifications
WHERE user_id = '<INVITEE_USER_ID>'
AND type = 'board_invite'
ORDER BY created_at DESC
LIMIT 1;
```

---

## Troubleshooting

### Issue: "Error: relation board_invitations does not exist"

**Fix**: Migration wasn't applied
```bash
# Run migration manually
cd /Users/kndri/projects/troodie
npx supabase db push

# Or copy/paste migration file in SQL Editor
```

---

### Issue: "Error: relation board_members does not exist" (from migration)

**Fix**: You're running the OLD migration file
```bash
# Make sure you're using the UPDATED migration file
# The file should have "board_collaborators" not "board_members"
cat /Users/kndri/projects/troodie/supabase/migrations/20251001_critical_fixes.sql | grep "board_collaborators"

# Should show lines with "board_collaborators"
```

---

### Issue: Invitation created but no notification appears in app

**Possible causes**:

1. **App not fetching notifications**
   - Check notification service
   - Check if real-time subscription is active

2. **RLS policy blocking**
   ```sql
   -- Check RLS policies
   SELECT * FROM notifications
   WHERE user_id = '<YOUR_USER_ID>'
   ORDER BY created_at DESC;

   -- If empty, temporarily disable RLS for testing
   ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
   -- Then retry
   ```

3. **Notification service not found**
   - Check if notification service file exists
   - Check if notifications hook exists

---

### Issue: Can see notification but can't accept invitation

**Check accept_board_invitation function:**

```sql
-- Test the function
SELECT accept_board_invitation(
  '<INVITATION_ID>',
  '<USER_ID>'
);

-- Should return:
-- {"success": true, "message": "Invitation accepted"}
```

---

## Verification Checklist

After completing all steps, verify:

- [ ] Migration ran successfully (no errors)
- [ ] `board_invitations` table exists
- [ ] `board_collaborators` table exists
- [ ] Can send invitation from app (no errors in console)
- [ ] Invitation record created in database
- [ ] Notification record created in database
- [ ] Notification appears in app UI
- [ ] Can tap notification (navigates somewhere)
- [ ] Can accept invitation
- [ ] After accepting, user added to `board_collaborators`
- [ ] Board appears in invitee's "Boards" tab

---

## Quick Test Script

Copy this entire block into Supabase SQL Editor for a quick end-to-end test:

```sql
-- REPLACE THESE VALUES FIRST:
\set inviter_id 'YOUR_USER_ID_1'
\set invitee_id 'YOUR_USER_ID_2'
\set board_id 'YOUR_BOARD_ID'

-- 1. Clean up any existing test data
DELETE FROM board_invitations
WHERE board_id = :'board_id' AND invitee_id = :'invitee_id';

DELETE FROM notifications
WHERE user_id = :'invitee_id' AND type = 'board_invite';

-- 2. Create invitation
INSERT INTO board_invitations (
  board_id, inviter_id, invitee_id, status, expires_at
)
VALUES (
  :'board_id', :'inviter_id', :'invitee_id', 'pending', NOW() + INTERVAL '7 days'
) RETURNING *;

-- 3. Create notification
INSERT INTO notifications (
  user_id, type, title, message, related_id, related_type
)
VALUES (
  :'invitee_id',
  'board_invite',
  'Board Invitation',
  'You have been invited to collaborate',
  :'board_id',
  'board'
) RETURNING *;

-- 4. Verify both were created
SELECT 'Invitations:' as check, COUNT(*) as count FROM board_invitations WHERE invitee_id = :'invitee_id'
UNION ALL
SELECT 'Notifications:' as check, COUNT(*) as count FROM notifications WHERE user_id = :'invitee_id' AND type = 'board_invite';
```

---

## Success Criteria

✅ **Test passes when:**
- Invitation visible in `board_invitations` table
- Notification visible in `notifications` table
- Notification appears in app (screenshot attached shows notification)
- Can tap to view/accept
- After accepting, user in `board_collaborators` table
- Board visible in user's boards list

---

## Next Steps After Fix

1. Test with real users
2. Test email invitations (if implemented)
3. Test shareable link invitations (if implemented)
4. Test invitation expiration
5. Test declining invitations
6. Update testing guide with screenshots

---

**Need Help?**
- Check app console for errors
- Check Supabase logs for SQL errors
- Share SQL query results
- Provide screenshots of app behavior
