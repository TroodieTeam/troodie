# Board Services Documentation

Board services handle all operations related to boards (collections of saved restaurants).

## Files

### boardService.ts
Core board CRUD operations and queries.

**Key Functions:**
- `createBoard()` - Create new board
- `getUserBoards()` - Get user's boards
- `getBoardWithRestaurants()` - Get board with restaurant details
- `updateBoard()` - Update board metadata
- `deleteBoard()` - Delete board and all associations
- `addRestaurantToBoard()` - Add restaurant to board
- `removeRestaurantFromBoard()` - Remove restaurant from board

**Database Tables:**
- `boards` - Board metadata (name, description, visibility)
- `board_restaurants` - Junction table (board_id, restaurant_id)
- `board_collaborators` - Board members

**RLS Policies:**
- Users can create boards
- Users can see public boards and their own boards
- Users can edit their own boards
- Board members can see private boards they're part of

### boardInvitationService.ts
Handles board invitation system for collaborative boards.

**Key Functions:**
- `inviteByUserId()` - Send invitation to user
- `inviteByEmail()` - Send invitation by email
- `createInviteLink()` - Generate shareable invite link
- `acceptInvitation()` - Accept board invitation (adds to board_collaborators)
- `declineInvitation()` - Decline invitation
- `getUserInvitations()` - Get pending invitations for user
- `getBoardInvitations()` - Get all invitations for a board (owner view)
- `cancelInvitation()` - Cancel pending invitation

**Database Tables:**
- `board_invitations` - Invitation records
  - `invitee_id` - User being invited
  - `inviter_id` - User sending invite
  - `board_id` - Board ID
  - `status` - pending/accepted/declined/expired
  - `invite_link_token` - For shareable links
  - `expires_at` - Expiration timestamp (7 days default)

**Database Functions:**
- `accept_board_invitation()` - Atomically accept and add to board_collaborators
- `decline_board_invitation()` - Mark invitation as declined
- `get_user_pending_invitations()` - Get invitations with board/inviter details
- `generate_invite_token()` - Generate unique token for invite links

**Notification Integration:**
When an invitation is sent, creates a `board_invite` notification with:
```typescript
{
  type: 'board_invite',
  related_id: boardId,  // Navigation target
  data: {
    invitation_id: invitationId,  // For modal display
    board_id: boardId,
    board_name: boardName,
    inviter_id: inviterId,
    inviter_name: inviterName
  }
}
```

**Invitation Flow:**
1. Owner calls `inviteByUserId(boardId, ownerId, inviteeId)`
2. Service creates invitation record
3. Service creates notification for invitee
4. Invitee sees notification in app
5. Clicking notification navigates to board with `invitation_id` param
6. Board screen detects pending invitation
7. Shows modal to accept/decline
8. On accept: calls `acceptInvitation()` → adds to board_collaborators
9. On decline: calls `declineInvitation()` → marks declined

**Navigation Pattern:**
```typescript
// From notification:
router.push(`/boards/${boardId}?invitation_id=${invitationId}`);

// Board screen reads:
const invitationId = params.invitation_id;
// Fetch invitation and show modal
```

**Common Issues:**

1. **Modal not showing**: Check that `invitation_id` is passed in URL params
2. **RLS blocking query**: Ensure RLS policies allow invitee to read invitation
3. **Already accepted**: Check if user is already in board_collaborators
4. **Expired invitation**: Check expires_at > NOW()

**Testing:**
```typescript
// 1. Send invitation
const result = await boardInvitationService.inviteByUserId(
  'board-id',
  'inviter-id',
  'invitee-id'
);

// 2. Check notification created
const notifications = await notificationService.getUserNotifications('invitee-id');

// 3. Accept invitation
const accepted = await boardInvitationService.acceptInvitation(
  result.invitation.id,
  'invitee-id'
);

// 4. Verify user added to collaborators
const { data } = await supabase
  .from('board_collaborators')
  .select('*')
  .eq('board_id', 'board-id')
  .eq('user_id', 'invitee-id');
```

### boardServiceExtended.ts
Advanced board features (less commonly used).

## Board Types

Boards support three visibility levels:

1. **Public Boards** (`is_private: false`)
   - Anyone can view
   - Appear in discover/search
   - Good for sharing restaurant lists

2. **Private Boards** (`is_private: true`)
   - Only owner and collaborators can view
   - Good for personal planning

3. **Quick Saves** (special board)
   - Auto-created for each user
   - Name: "Your Saves"
   - Fast access to saved restaurants

## Common Patterns

### Creating a Board
```typescript
const board = await boardService.createBoard({
  userId: currentUser.id,
  name: 'Summer Eats 2025',
  description: 'Best spots to try this summer',
  is_private: false
});
```

### Adding Restaurants
```typescript
await boardService.addRestaurantToBoard(
  boardId,
  restaurantId,
  userId
);
```

### Fetching Board with Details
```typescript
const board = await boardService.getBoardWithRestaurants(boardId);
// Returns board with populated restaurant array
```

### Checking Membership
```typescript
const isMember = await boardService.isBoardMember(boardId, userId);
```

## Database Schema

### boards Table
```sql
CREATE TABLE boards (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255),
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  cover_photo_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### board_restaurants Table
```sql
CREATE TABLE board_restaurants (
  id UUID PRIMARY KEY,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id),
  user_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ
);
```

### board_collaborators Table
```sql
CREATE TABLE board_collaborators (
  id UUID PRIMARY KEY,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  role VARCHAR(50) DEFAULT 'member',
  added_at TIMESTAMPTZ
);
```

### board_invitations Table
```sql
CREATE TABLE board_invitations (
  id UUID PRIMARY KEY,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  inviter_id UUID REFERENCES users(id),
  invitee_id UUID REFERENCES users(id),
  invite_email VARCHAR(255),
  invite_link_token VARCHAR(100) UNIQUE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ
);
```

## UI Integration

### Board Detail Screen (`app/boards/[id].tsx`)
- Displays board info and restaurants
- Checks for pending invitations on mount
- Shows invitation modal if pending
- Allows owner to invite collaborators

### Notifications Screen (`app/notifications/index.tsx`)
- Handles `board_invite` notification type
- Navigates to board with invitation_id param

### Navigation
```typescript
// To board detail
router.push(`/boards/${boardId}`);

// With invitation
router.push(`/boards/${boardId}?invitation_id=${invitationId}`);
```

## Troubleshooting

### Board Not Loading
- Check RLS policies
- Verify user auth session
- Check if board exists

### Can't Add Restaurant
- Verify user is owner or collaborator
- Check restaurant exists
- Check for duplicates

### Invitation Issues
- See boardInvitationService.ts section above
- Check RLS policies on board_invitations
- Verify notification created
- Check invitation_id in URL params

## Related Files
- `app/boards/[id].tsx` - Board detail screen
- `components/BoardCard.tsx` - Board display component
- `hooks/useBoards.ts` - Board state management (if exists)
- `types/board.ts` - TypeScript types
