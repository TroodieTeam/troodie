# Board Invitation Modal Fix

## Problem Identified

When clicking on a board invitation notification, the board detail screen would open but the invitation acceptance modal would not appear.

### Root Cause

The notification handler in `app/notifications/index.tsx` was navigating to the board without passing the `invitation_id` as a query parameter. The board detail screen (`app/boards/[id].tsx`) was expecting this parameter to fetch and display the invitation modal.

**Notification Data Structure:**
```json
{
  "id": "notification-id",
  "type": "board_invite",
  "related_id": "board-id",
  "data": {
    "invitation_id": "invitation-uuid",
    "board_id": "board-id",
    "board_name": "Board Name",
    "inviter_id": "inviter-uuid",
    "inviter_name": "Inviter Name"
  }
}
```

## Fix Applied

Updated `app/notifications/index.tsx` (lines 105-140) to:
1. Extract the `invitation_id` from `notification.data.invitation_id`
2. Pass it as a query parameter when navigating to the board: `/boards/{boardId}?invitation_id={invitationId}`

This ensures the board detail screen receives the invitation ID and can:
1. Fetch the invitation details from the `board_invitations` table
2. Display the invitation acceptance modal
3. Allow the user to accept or decline the invitation

## Testing Instructions

### Prerequisites
You need:
1. Two user accounts (User A = inviter, User B = invitee)
2. A board owned by User A
3. Access to both accounts for testing

### Test Steps

1. **Create Test Invitation** (using the SQL file you already have):
   ```bash
   # Connect to your Supabase project and run:
   cd supabase/migrations
   # Edit create_test_board_invitation.sql with correct user IDs
   # Then execute it via Supabase dashboard SQL editor
   ```

2. **Test the Flow**:
   - Log in as User B (the invitee)
   - Navigate to the Notifications tab
   - You should see a board invitation notification
   - Click on the notification
   - **Expected Result**: Board detail screen opens with an invitation modal showing:
     - "You've been invited to collaborate on [Board Name]"
     - "Accept" button
     - "Decline" button

3. **Test Accept Flow**:
   - Click "Accept" in the modal
   - **Expected Result**:
     - Success toast: "Invitation accepted! You are now a collaborator"
     - Modal closes
     - Board reloads showing you as a collaborator

4. **Test Decline Flow** (reset invitation to pending first):
   - Click "Decline" in the modal
   - **Expected Result**:
     - Success toast: "Invitation declined"
     - Navigate back to previous screen

### Console Logs to Monitor

When clicking the notification, you should see:
```
[Notifications] Board invite notification: { related_id: '...', data: { invitation_id: '...', ... } }
[Notifications] Navigating to board via related_id: board-uuid with invitation_id: invitation-uuid
[BoardDetail] Component mounted with boardId: board-uuid
[BoardDetail] Checking for pending invitations for user: user-uuid
[BoardDetail] Invitation ID from params: invitation-uuid
[BoardDetail] Fetching specific invitation: invitation-uuid
[BoardDetail] Found invitation with status: pending
[BoardDetail] Setting pending invitation and showing modal
```

### Known Issues / Edge Cases

1. **RLS Policies**: The board detail screen queries `board_invitations` directly. Ensure RLS policies allow:
   - Invitees to read invitations where `invitee_id = current_user_id`
   - No status filter on the read (or it will fail for accepted/declined invitations)

2. **Invitation Already Processed**: If the invitation was already accepted/declined, the modal won't show (expected behavior)

3. **Expired Invitations**: Invitations older than 7 days are considered expired

## Files Modified

- `app/notifications/index.tsx` - Added invitation_id query parameter to board navigation

## Related Files (No Changes Needed)

- `app/boards/[id].tsx` - Already has logic to handle invitation_id param
- `services/boardInvitationService.ts` - Already creates notifications with invitation_id
- `supabase/migrations/create_test_board_invitation.sql` - Test data creation script
