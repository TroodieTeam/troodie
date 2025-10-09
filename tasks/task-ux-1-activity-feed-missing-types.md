# Activity Feed - Missing Save and Board Creation Activities

- Epic: UX
- Priority: High
- Estimate: 2 days
- Status: 🔴 Not Started

## Problem Statement

Users are not seeing important activity types in their activity feed:
1. Restaurant saves are not appearing (e.g., "Taylor saved Las Lap Miami")
2. Board creations are not appearing (e.g., "Taylor created new board 'Luxury Restaurants'")

This reduces engagement and makes the activity feed feel incomplete, as users miss out on their friends' curation activity.

## Acceptance Criteria (Gherkin)

**Feature: Display Restaurant Save Activity**
  As a user viewing the activity feed
  I want to see when friends save restaurants
  So that I can discover restaurants they're interested in

  **Scenario: Friend saves a public restaurant**
    Given a user has friends they follow
    And a friend saves a restaurant with public privacy
    When the user views the activity feed
    Then they should see "{Friend Name} saved {Restaurant Name}"
    And the activity should show the restaurant name and optional rating
    And tapping the activity should navigate to the restaurant details

  **Scenario: Friend saves a private restaurant**
    Given a friend saves a restaurant with private privacy
    When the user views the activity feed
    Then they should NOT see the save activity
    And the activity feed should only show public saves

**Feature: Display Board Creation Activity**
  As a user viewing the activity feed
  I want to see when friends create new boards
  So that I can discover their curated collections

  **Scenario: Friend creates a public board**
    Given a user has friends they follow
    And a friend creates a new board with public or friends privacy
    When the user views the activity feed
    Then they should see "{Friend Name} created new board '{Board Name}'"
    And the activity should show the board name and description
    And tapping the activity should navigate to the board details

  **Scenario: Friend creates a private board**
    Given a friend creates a board with private privacy
    When the user views the activity feed
    Then they should NOT see the board creation activity
    And the activity feed should only show public/friends boards

**Feature: Real-time Activity Updates**
  As a user with the activity feed open
  I want to see new saves and board creations appear in real-time
  So that I stay up-to-date with my friends' activity

  **Scenario: Friend saves restaurant while feed is open**
    Given the user has the activity feed open
    When a friend saves a restaurant
    Then the save activity should appear at the top of the feed
    And the feed should not require manual refresh

  **Scenario: Friend creates board while feed is open**
    Given the user has the activity feed open
    When a friend creates a new board
    Then the board creation activity should appear at the top of the feed
    And the feed should not require manual refresh

## Technical Implementation

### Files to Modify

1. **`services/activityFeedService.ts`** (Primary changes)
   - Line 6: Add 'board_created' to activity_type union
   - Lines 120-220: Add real-time subscription for boards table
   - Add new `transformBoardCreatedToActivity()` method

2. **`supabase/migrations/` (Database changes)**
   - Update `get_activity_feed` RPC function to include:
     - restaurant_saves query (verify it's being included)
     - boards creation query (new)
   - Ensure privacy filtering works correctly for both types

3. **`app/(tabs)/activity.tsx`** (UI verification)
   - Verify ActivityCard component handles new activity types
   - Add navigation handlers for board_created activities

### Database Changes

#### Update get_activity_feed RPC Function
```sql
-- Add to activity feed RPC function
CREATE OR REPLACE FUNCTION get_activity_feed(
  p_user_id UUID,
  p_filter TEXT DEFAULT 'all',
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_after_timestamp TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  activity_type TEXT,
  activity_id UUID,
  actor_id UUID,
  actor_name TEXT,
  actor_username TEXT,
  actor_avatar TEXT,
  actor_is_verified BOOLEAN,
  action TEXT,
  target_name TEXT,
  target_id TEXT,
  target_type TEXT,
  rating NUMERIC,
  content TEXT,
  photos TEXT[],
  related_user_id UUID,
  related_user_name TEXT,
  related_user_username TEXT,
  related_user_avatar TEXT,
  privacy TEXT,
  created_at TIMESTAMPTZ,
  restaurant_id VARCHAR,
  cuisine_types TEXT[],
  restaurant_location TEXT,
  community_id UUID,
  community_name TEXT,
  board_id UUID,
  board_name TEXT
) AS $$
BEGIN
  RETURN QUERY

  -- Existing queries (posts, follows, likes, comments, community joins)
  -- ...

  -- Restaurant Saves
  UNION ALL
  SELECT
    'save'::TEXT as activity_type,
    rs.id as activity_id,
    rs.user_id as actor_id,
    u.name as actor_name,
    u.username as actor_username,
    u.avatar_url as actor_avatar,
    u.is_verified as actor_is_verified,
    'saved'::TEXT as action,
    r.name as target_name,
    rs.restaurant_id as target_id,
    'restaurant'::TEXT as target_type,
    rs.personal_rating as rating,
    rs.notes as content,
    rs.photos as photos,
    NULL::UUID as related_user_id,
    NULL::TEXT as related_user_name,
    NULL::TEXT as related_user_username,
    NULL::TEXT as related_user_avatar,
    rs.privacy as privacy,
    rs.created_at,
    rs.restaurant_id,
    r.cuisine_types,
    r.location as restaurant_location,
    NULL::UUID as community_id,
    NULL::TEXT as community_name,
    rs.board_id,
    b.name as board_name
  FROM restaurant_saves rs
  JOIN users u ON rs.user_id = u.id
  JOIN restaurants r ON rs.restaurant_id = r.id
  LEFT JOIN boards b ON rs.board_id = b.id
  WHERE rs.privacy = 'public'
    AND (p_filter = 'all' OR (p_filter = 'friends' AND EXISTS (
      SELECT 1 FROM user_relationships
      WHERE follower_id = p_user_id
      AND following_id = rs.user_id
      AND status = 'active'
    )))
    AND (p_after_timestamp IS NULL OR rs.created_at > p_after_timestamp)

  -- Board Creations (NEW)
  UNION ALL
  SELECT
    'board_created'::TEXT as activity_type,
    b.id as activity_id,
    b.user_id as actor_id,
    u.name as actor_name,
    u.username as actor_username,
    u.avatar_url as actor_avatar,
    u.is_verified as actor_is_verified,
    'created new board'::TEXT as action,
    b.name as target_name,
    b.id::TEXT as target_id,
    'board'::TEXT as target_type,
    NULL::NUMERIC as rating,
    b.description as content,
    ARRAY[b.cover_image_url]::TEXT[] as photos,
    NULL::UUID as related_user_id,
    NULL::TEXT as related_user_name,
    NULL::TEXT as related_user_username,
    NULL::TEXT as related_user_avatar,
    b.privacy as privacy,
    b.created_at,
    NULL::VARCHAR as restaurant_id,
    NULL::TEXT[] as cuisine_types,
    NULL::TEXT as restaurant_location,
    NULL::UUID as community_id,
    NULL::TEXT as community_name,
    b.id as board_id,
    b.name as board_name
  FROM boards b
  JOIN users u ON b.user_id = u.id
  WHERE b.privacy IN ('public', 'friends')
    AND (p_filter = 'all' OR (p_filter = 'friends' AND EXISTS (
      SELECT 1 FROM user_relationships
      WHERE follower_id = p_user_id
      AND following_id = b.user_id
      AND status = 'active'
    )))
    AND (p_after_timestamp IS NULL OR b.created_at > p_after_timestamp)

  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Service Layer Changes

#### activityFeedService.ts

**Update ActivityFeedItem type (line 6):**
```typescript
export interface ActivityFeedItem {
  activity_type: 'post' | 'save' | 'follow' | 'community_join' | 'like' | 'comment' | 'board_created';
  // ... rest stays the same
}
```

**Add board creation subscription (after line 212):**
```typescript
// Subscribe to new board creations
.on(
  'postgres_changes',
  {
    event: 'INSERT',
    schema: 'public',
    table: 'boards',
  },
  async (payload) => {
    if (payload.new.privacy === 'public' || payload.new.privacy === 'friends') {
      const activity = await this.transformBoardCreatedToActivity(payload.new);
      if (activity) onNewActivity(activity);
    }
  }
)
```

**Add transform function (after line 420):**
```typescript
/**
 * Transform a new board creation into an activity item
 */
private async transformBoardCreatedToActivity(board: any): Promise<ActivityFeedItem | null> {
  try {
    // Only show public and friends boards
    if (board.privacy === 'private') return null;

    const userResult = await supabase
      .from('users')
      .select('name, username, avatar_url, is_verified')
      .eq('id', board.user_id)
      .single();

    if (userResult.error) return null;

    return {
      activity_type: 'board_created',
      activity_id: board.id,
      actor_id: board.user_id,
      actor_name: userResult.data.name,
      actor_username: userResult.data.username,
      actor_avatar: userResult.data.avatar_url,
      actor_is_verified: userResult.data.is_verified,
      action: 'created new board',
      target_name: board.name,
      target_id: board.id,
      target_type: 'board',
      rating: null,
      content: board.description,
      photos: board.cover_image_url ? [board.cover_image_url] : null,
      related_user_id: null,
      related_user_name: null,
      related_user_username: null,
      related_user_avatar: null,
      privacy: board.privacy,
      created_at: board.created_at,
      restaurant_id: null,
      cuisine_types: null,
      restaurant_location: null,
      community_id: null,
      community_name: null,
      board_id: board.id,
      board_name: board.name,
    };
  } catch (error) {
    console.error('Error transforming board creation to activity:', error);
    return null;
  }
}
```

### UI Component Updates

#### app/(tabs)/activity.tsx

**Verify ActivityCard handles new types:**
- Ensure the switch statement handles 'board_created' and 'save' types
- Add appropriate navigation for board_created (navigate to /boards/[id])
- Verify save activities show correct restaurant name and optional rating

**Example rendering logic:**
```typescript
const renderActivity = (activity: ActivityFeedItem) => {
  switch (activity.activity_type) {
    case 'save':
      return (
        <Pressable onPress={() => router.push(`/restaurant/${activity.restaurant_id}`)}>
          <ActivityCard
            actorName={activity.actor_name}
            action="saved"
            targetName={activity.target_name}
            rating={activity.rating}
            timestamp={activity.created_at}
            // ... other props
          />
        </Pressable>
      );

    case 'board_created':
      return (
        <Pressable onPress={() => router.push(`/boards/${activity.board_id}`)}>
          <ActivityCard
            actorName={activity.actor_name}
            action="created new board"
            targetName={activity.board_name}
            description={activity.content}
            coverImage={activity.photos?.[0]}
            timestamp={activity.created_at}
            // ... other props
          />
        </Pressable>
      );

    // ... other cases
  }
};
```

## Testing Plan

### Manual Testing

1. **Test Save Activity:**
   - Log in as User A
   - Save a restaurant with public privacy
   - Log in as User B (friend of User A)
   - Navigate to activity feed
   - Verify save appears as "User A saved Restaurant Name"
   - Tap activity and verify it navigates to restaurant

2. **Test Board Creation Activity:**
   - Log in as User A
   - Create a new board with public privacy
   - Log in as User B (friend of User A)
   - Navigate to activity feed
   - Verify creation appears as "User A created new board 'Board Name'"
   - Tap activity and verify it navigates to board

3. **Test Privacy Filtering:**
   - Create save with private privacy
   - Create board with private privacy
   - Verify neither appears in friends' feeds
   - Create save with public privacy
   - Create board with public privacy
   - Verify both appear in friends' feeds

4. **Test Real-time Updates:**
   - Open activity feed on Device A
   - On Device B, save a restaurant as a friend
   - Verify save appears in real-time on Device A
   - On Device B, create a board as a friend
   - Verify board creation appears in real-time on Device A

### Database Verification

```sql
-- Verify save activities are returned
SELECT * FROM get_activity_feed(
  'user-id-here',
  'all',
  50,
  0,
  NULL
) WHERE activity_type = 'save';

-- Verify board creation activities are returned
SELECT * FROM get_activity_feed(
  'user-id-here',
  'all',
  50,
  0,
  NULL
) WHERE activity_type = 'board_created';

-- Check that private items are excluded
SELECT * FROM restaurant_saves WHERE privacy = 'private';
SELECT * FROM boards WHERE privacy = 'private';
```

## Edge Cases

1. **Save without board:** Restaurant save not in a board should still show
2. **Board with no description:** Should show board creation without description text
3. **Deleted restaurant:** If restaurant is deleted after save, handle gracefully
4. **Deleted board:** If board is deleted, remove from activity feed
5. **User unfriends:** Activities should still show historical saves/boards
6. **Blocked users:** Saves and board creations from blocked users should not appear

## Performance Considerations

- RPC function should use proper indexes on:
  - `restaurant_saves.created_at`
  - `restaurant_saves.privacy`
  - `boards.created_at`
  - `boards.privacy`
- Real-time subscriptions should filter at the database level
- Consider pagination limits for large activity feeds

## Rollback Plan

If issues arise:
1. Revert database migration to remove board_created from RPC
2. Revert activityFeedService.ts changes
3. Keep save activity changes if they work correctly
4. Fix issues in isolation before re-deploying

## Related Files

- `services/activityFeedService.ts` - Activity feed logic
- `hooks/useActivityFeed.ts` - Activity feed hook
- `app/(tabs)/activity.tsx` - Activity feed UI
- `supabase/migrations/` - Database RPC functions
- `components/ActivityCard.tsx` - Activity display component

## Success Metrics

- [ ] Saves appear in activity feed with correct format
- [ ] Board creations appear in activity feed with correct format
- [ ] Privacy filtering works (public/friends visible, private hidden)
- [ ] Real-time updates work for both activity types
- [ ] Navigation from activities works correctly
- [ ] No performance degradation in feed loading
- [ ] All edge cases handled gracefully
