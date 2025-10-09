# Follower/Following Count - Real-time Sync Issues

- Epic: REACTIVE
- Priority: High
- Estimate: 2 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Users report that follower and following counts don't update reliably when viewing profiles. The `useFollowState` hook has real-time subscriptions (lines 64-188), but there are race conditions between optimistic updates, database triggers, and real-time events. Counts can be off by 1-2, and sometimes don't update until the user refreshes the page.

## Business Value
- **Social Proof**: Accurate follower counts build trust and encourage engagement
- **User Confidence**: Inconsistent numbers make users question if their actions worked
- **Creator Features**: Accurate metrics are critical for creator dashboards and analytics
- **Metric**: Target 99.5% accuracy in displayed counts vs database reality

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Accurate follower/following counts
  As a user viewing a profile
  I want to see accurate follower/following counts
  So that I trust the app's social features

  Scenario: Follow a user and see count update
    Given I am viewing User B's profile
    And User B has 42 followers
    And I am not following User B
    When I tap the "Follow" button
    Then button changes to "Following" immediately
    And User B's follower count shows 43 immediately
    And my following count increments by 1
    And after API succeeds, counts remain accurate

  Scenario: Unfollow a user and see count update
    Given I am viewing User B's profile who I follow
    And User B has 50 followers
    And I have 30 following
    When I tap "Following" button
    Then button changes to "Follow" immediately
    And User B's follower count shows 49 immediately
    And my following count shows 29 immediately

  Scenario: View my own profile counts
    Given I am viewing my own profile
    And I have 100 followers and 75 following
    When I navigate to another user and follow them
    And I return to my profile
    Then my following count shows 76
    And the count matches database exactly

  Scenario: Real-time count updates from other users
    Given I am viewing User B's profile (50 followers)
    When User C follows User B
    Then I see follower count update to 51 in real-time
    But my follow button state doesn't change

  Scenario: Multiple users follow simultaneously
    Given User B has 100 followers
    When 5 users follow User B at the same time
    Then the count accurately shows 105
    And no increments are lost due to race conditions

  Scenario: Follow/unfollow rapid toggle
    Given I am viewing a profile
    When I tap follow then unfollow rapidly (within 1 second)
    Then only the final state is committed to database
    And counts reflect the final state accurately
    And no phantom relationships exist

  Scenario: Offline follow attempt
    Given I have no network connection
    When I tap follow button
    Then UI updates optimistically
    When connection is restored
    Then follow is committed to database
    And counts are reconciled with server
```

## Technical Implementation

### Root Causes Identified (from `hooks/useFollowState.ts`)

1. **Lines 96-188: Complex Real-time Logic**
   - Separate subscriptions for own profile vs others' profiles
   - INSERT/DELETE events both try to update counts
   - No timestamp-based conflict resolution

2. **Lines 191-228: Optimistic Update Race**
   - `toggleFollow` updates state before API resolves
   - Real-time subscription can fire during API call
   - Revert logic (lines 218-224) can conflict with subscription updates

3. **Database Trigger Timing**
   - `users.followers_count` and `users.following_count` updated by trigger
   - Trigger may fire before Supabase returns, causing stale reads

4. **No Request Deduplication**
   - Multiple rapid taps can create duplicate API calls
   - Race between multiple requests updating same state

### Components to Modify

#### 1. `hooks/useFollowState.ts` - Complete Refactor

**Current Issues**:
- Too many real-time subscriptions (3 different channel patterns)
- Optimistic update doesn't consider in-flight requests
- No debouncing for rapid taps

**New Implementation**:
```typescript
interface UseFollowStateProps {
  userId: string;
  initialIsFollowing?: boolean;
  initialFollowersCount?: number;
  initialFollowingCount?: number;
  onFollowChange?: (isFollowing: boolean) => void;
}

interface FollowState {
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
  loading: boolean;
  lastSyncTimestamp: number; // NEW: Track last sync
}

export function useFollowState({
  userId,
  initialIsFollowing = false,
  initialFollowersCount = 0,
  initialFollowingCount = 0,
  onFollowChange
}: UseFollowStateProps) {
  const { user: currentUser } = useAuth();
  const [state, setState] = useState<FollowState>({
    isFollowing: initialIsFollowing,
    followersCount: initialFollowersCount,
    followingCount: initialFollowingCount,
    loading: false,
    lastSyncTimestamp: Date.now()
  });

  // Prevent concurrent toggles
  const isToggling = useRef(false);

  // Debounce rapid taps (300ms)
  const debouncedToggle = useRef<NodeJS.Timeout | null>(null);

  // ... (initialization and initial load remain similar)

  // SIMPLIFIED: Single real-time subscription for count updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-follow-stats-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          const serverTimestamp = new Date(payload.new.updated_at).getTime();

          // Only update if server data is newer than our last optimistic update
          setState(prev => {
            if (serverTimestamp > prev.lastSyncTimestamp) {
              return {
                ...prev,
                followersCount: payload.new.followers_count || 0,
                followingCount: payload.new.following_count || 0,
                lastSyncTimestamp: serverTimestamp
              };
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // IMPROVED: Toggle with debouncing and request deduplication
  const toggleFollow = useCallback(async () => {
    if (!currentUser?.id || !userId || currentUser.id === userId) return;
    if (isToggling.current) return; // Prevent concurrent requests

    // Clear any pending debounced call
    if (debouncedToggle.current) {
      clearTimeout(debouncedToggle.current);
    }

    isToggling.current = true;
    setState(prev => ({ ...prev, loading: true }));

    // Store previous state for rollback
    const wasFollowing = state.isFollowing;
    const prevFollowersCount = state.followersCount;
    const prevFollowingCount = state.followingCount;

    // Optimistic update with timestamp
    const optimisticTimestamp = Date.now();
    setState(prev => ({
      ...prev,
      isFollowing: !wasFollowing,
      followersCount: wasFollowing
        ? Math.max(0, prev.followersCount - 1)
        : prev.followersCount + 1,
      followingCount: currentUser.id === userId
        ? (wasFollowing ? prev.followingCount - 1 : prev.followingCount + 1)
        : prev.followingCount,
      lastSyncTimestamp: optimisticTimestamp
    }));

    // Add haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      let result;
      if (wasFollowing) {
        result = await FollowService.unfollowUser(userId);
      } else {
        result = await FollowService.followUser(userId);
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to update follow status');
      }

      // Success - verify counts with server
      await refreshCounts();

      onFollowChange?.(!wasFollowing);
    } catch (error) {
      console.error('Error toggling follow:', error);

      // Rollback optimistic update
      setState(prev => ({
        ...prev,
        isFollowing: wasFollowing,
        followersCount: prevFollowersCount,
        followingCount: prevFollowingCount,
        lastSyncTimestamp: Date.now()
      }));

      Alert.alert(
        'Error',
        wasFollowing ? 'Failed to unfollow user' : 'Failed to follow user'
      );
    } finally {
      setState(prev => ({ ...prev, loading: false }));
      isToggling.current = false;
    }
  }, [currentUser?.id, userId, state.isFollowing, onFollowChange]);

  // IMPROVED: Refresh counts with deduplication
  const refreshCounts = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('followers_count, following_count, updated_at')
        .eq('id', userId)
        .single();

      if (!error && data) {
        const serverTimestamp = new Date(data.updated_at).getTime();

        setState(prev => {
          // Only update if server data is newer
          if (serverTimestamp >= prev.lastSyncTimestamp) {
            return {
              ...prev,
              followersCount: data.followers_count || 0,
              followingCount: data.following_count || 0,
              lastSyncTimestamp: serverTimestamp
            };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error refreshing counts:', error);
    }
  }, [userId]);

  // Auto-refresh on focus (reconcile with server)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshCounts();
    });

    return unsubscribe;
  }, [refreshCounts]);

  return {
    isFollowing: state.isFollowing,
    followersCount: state.followersCount,
    followingCount: state.followingCount,
    loading: state.loading,
    toggleFollow,
    refreshCounts
  };
}
```

#### 2. `services/followService.ts` - Add Deduplication

```typescript
export class FollowService {
  private static activeRequests = new Map<string, Promise<any>>();

  static async followUser(userId: string): Promise<{ success: boolean; error?: string }> {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: 'Not authenticated' };

    // Prevent duplicate requests
    const requestKey = `follow-${currentUser.id}-${userId}`;
    if (this.activeRequests.has(requestKey)) {
      return this.activeRequests.get(requestKey)!;
    }

    const requestPromise = this._executeFollow(currentUser.id, userId);
    this.activeRequests.set(requestKey, requestPromise);

    requestPromise.finally(() => {
      this.activeRequests.delete(requestKey);
    });

    return requestPromise;
  }

  private static async _executeFollow(followerId: string, followingId: string) {
    try {
      const { error } = await supabase
        .from('user_relationships')
        .insert({
          follower_id: followerId,
          following_id: followingId,
          created_at: new Date().toISOString()
        });

      if (error) {
        // Check for duplicate (idempotent)
        if (error.code === '23505') {
          return { success: true }; // Already following
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Network error' };
    }
  }

  // Similar for unfollowUser...
}
```

#### 3. Database Triggers - Ensure Atomicity

**File**: `supabase/migrations/YYYYMMDD_fix_follow_count_triggers.sql`

```sql
-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS update_follower_count_on_follow ON user_relationships;
DROP TRIGGER IF EXISTS update_following_count_on_follow ON user_relationships;
DROP FUNCTION IF EXISTS update_follow_counts();

-- Create atomic trigger function
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count for the followed user
    UPDATE users
    SET followers_count = COALESCE(followers_count, 0) + 1,
        updated_at = NOW()
    WHERE id = NEW.following_id;

    -- Increment following count for the follower
    UPDATE users
    SET following_count = COALESCE(following_count, 0) + 1,
        updated_at = NOW()
    WHERE id = NEW.follower_id;

  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement follower count for the unfollowed user
    UPDATE users
    SET followers_count = GREATEST(COALESCE(followers_count, 1) - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.following_id;

    -- Decrement following count for the unfollower
    UPDATE users
    SET following_count = GREATEST(COALESCE(following_count, 1) - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.follower_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_follow_counts_trigger
AFTER INSERT OR DELETE ON user_relationships
FOR EACH ROW
EXECUTE FUNCTION update_follow_counts();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_relationships_follower ON user_relationships(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_following ON user_relationships(following_id);
```

#### 4. Count Reconciliation Job (Optional)

For extra safety, add a periodic job to fix any count drift:

```sql
-- Reconcile follower counts with actual relationships
CREATE OR REPLACE FUNCTION reconcile_follow_counts()
RETURNS void AS $$
BEGIN
  -- Fix followers_count
  UPDATE users u
  SET followers_count = (
    SELECT COUNT(*)
    FROM user_relationships
    WHERE following_id = u.id
  )
  WHERE u.followers_count != (
    SELECT COUNT(*)
    FROM user_relationships
    WHERE following_id = u.id
  );

  -- Fix following_count
  UPDATE users u
  SET following_count = (
    SELECT COUNT(*)
    FROM user_relationships
    WHERE follower_id = u.id
  )
  WHERE u.following_count != (
    SELECT COUNT(*)
    FROM user_relationships
    WHERE follower_id = u.id
  );
END;
$$ LANGUAGE plpgsql;

-- Run nightly via cron or Edge Function
```

### Analytics & Telemetry
Track:
- Count accuracy (compare UI state to database)
- Follow/unfollow success rate
- Time from tap to visual feedback
- Real-time sync latency
- Count drift occurrences (trigger alerts if >5% drift)

### Error States and Retries
1. **Network Errors**: Auto-retry up to 3 times
2. **Duplicate Follow**: Treat as success (idempotent)
3. **Server Errors**: Show error, allow manual retry
4. **Count Drift Detected**: Auto-reconcile in background

## Definition of Done
- [ ] Follow/unfollow button responds within 100ms
- [ ] Counts update immediately with optimistic UI
- [ ] Real-time updates don't override user's optimistic state
- [ ] No duplicate follow requests during rapid taps
- [ ] Counts reconcile with database on screen focus
- [ ] Database triggers are atomic and handle concurrency
- [ ] Count drift is <0.5% across all users
- [ ] Unit tests for all count update scenarios
- [ ] E2E tests with concurrent follows
- [ ] Analytics tracking count accuracy
- [ ] Performance profiled (no UI lag)

## Notes
### Related Files
- `hooks/useFollowState.ts` - Main hook (needs refactor)
- `services/followService.ts` - Service layer
- `app/user/[id].tsx` - User profile screen
- `app/(tabs)/profile.tsx` - Own profile screen
- `components/UserSearchResult.tsx` - Search results

### Edge Cases to Test
1. User A and User B follow each other simultaneously
2. User follows/unfollows same person 10 times rapidly
3. App goes to background during follow operation
4. Database trigger fails (count gets out of sync)
5. Real-time subscription disconnects mid-operation

### References
- Instagram's follow count UX
- Twitter's follower sync patterns
- [Supabase: Handling Concurrent Updates](https://supabase.com/docs/guides/database/postgres/triggers)
