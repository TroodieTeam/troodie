# Community Join/Leave - Smooth State Management

- Epic: REACTIVE
- Priority: High
- Estimate: 1.5 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Users experience inconsistent behavior when joining/leaving communities. The "Join" button doesn't always update correctly, member counts lag behind actual state, and there's visual flickering. The app currently has optimistic updates (lines 132-198 in `app/add/community-detail.tsx`), but the implementation has race conditions and incomplete error handling.

## Business Value
- **Community Growth**: Smooth join flow reduces friction for new members
- **User Trust**: Reliable state updates build confidence in the app
- **Retention**: Buggy interactions cause users to abandon community features
- **Metric**: Target 95% successful join/leave operations with <200ms perceived latency

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Reliable community join/leave
  As a user browsing communities
  I want instant feedback when joining/leaving
  So that I know my action was successful

  Scenario: Join a public community
    Given I am viewing a public community detail page
    And I am not a member
    And the community has 42 members
    When I tap the "Join" button
    Then the button changes to "Leave" immediately
    And the member count shows 43 immediately
    And the button shows subtle loading indicator
    And after API succeeds, loading stops
    And I can now create posts in this community

  Scenario: Leave a community I'm a member of
    Given I am a member of a community
    And the community has 50 members
    When I tap "Leave" button
    Then I see a confirmation dialog
    When I confirm leaving
    Then button changes to "Join" immediately
    And member count shows 49 immediately
    And after API succeeds, I no longer see members-only content

  Scenario: Join fails due to network error
    Given I have no network connection
    When I tap "Join" button
    Then UI updates optimistically
    And I see an offline indicator
    When connection is restored
    Then join request retries automatically
    And I receive confirmation when successful

  Scenario: Join fails due to server error
    Given the server returns a 500 error
    When I tap "Join" button
    Then optimistic update reverts
    And I see error message "Unable to join community. Please try again."
    And button is in original "Join" state

  Scenario: Owner tries to leave their own community
    Given I am the owner of a community
    When I tap "Leave" button
    Then I see error "Owners cannot leave their own community"
    And button remains as "Leave" (no state change)

  Scenario: Real-time member count updates
    Given I am viewing a community
    When another user joins
    Then I see member count increment by 1
    But my join/leave button state doesn't change
```

## Technical Implementation

### Root Causes Identified
1. **State Desynchronization**: `isMember` state and `community.member_count` can drift apart
2. **Race Condition**: Real-time updates (if active) conflict with optimistic updates
3. **Incomplete Error Handling**: Some error paths don't revert state (lines 160-166)
4. **Missing Loading State**: No visual feedback during API call
5. **No Retry Mechanism**: Failed joins require manual retry

### Components to Modify

#### 1. `app/add/community-detail.tsx` (Lines 128-198)
**Current Code Analysis**:
```typescript
// Line 132: Good - stores previous state
const previousMemberState = isMember;
const previousMemberCount = community.member_count;

// Line 136-142: Good - optimistic update
setIsMember(!isMember);
setCommunity({
  ...community,
  member_count: isMember ? community.member_count - 1 : community.member_count + 1
});

// Line 149-166: ISSUE - inconsistent error handling
// Some errors revert, some don't show feedback
```

**Improvements Needed**:
```typescript
const [isJoining, setIsJoining] = useState(false);

const handleJoinLeave = async () => {
  if (!user) {
    router.push('/login');
    return;
  }

  if (!community) return;

  // Prevent double-taps
  if (isJoining) return;

  setIsJoining(true);

  const previousMemberState = isMember;
  const previousMemberCount = community.member_count;

  // Optimistic UI update
  setIsMember(!isMember);
  setCommunity({
    ...community,
    member_count: isMember ?
      Math.max(0, community.member_count - 1) :
      community.member_count + 1
  });

  // Add haptic feedback
  if (Platform.OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  try {
    const result = isMember
      ? await communityService.leaveCommunity(user.id, community.id)
      : await communityService.joinCommunity(user.id, community.id);

    if (result.success) {
      // Refresh member list in background (non-blocking)
      communityService.getCommunityMembers(community.id)
        .then(membersData => setMembers(membersData))
        .catch(err => console.error('Background refresh failed:', err));

      // Show subtle success feedback
      ToastService.showSuccess(
        isMember ? 'Left community' : 'Joined community'
      );
    } else {
      // Revert optimistic update
      revertJoinState(previousMemberState, previousMemberCount, result.error);
    }
  } catch (error) {
    // Network or unexpected error
    revertJoinState(
      previousMemberState,
      previousMemberCount,
      'Network error. Please check your connection.'
    );
  } finally {
    setIsJoining(false);
  }
};

const revertJoinState = (prevState: boolean, prevCount: number, errorMsg?: string) => {
  setIsMember(prevState);
  setCommunity(prev => ({
    ...prev!,
    member_count: prevCount
  }));

  if (errorMsg && errorMsg !== 'Owners cannot leave their own community') {
    ToastService.showError(errorMsg);
  } else if (errorMsg === 'Owners cannot leave their own community') {
    Alert.alert('Cannot Leave', errorMsg);
  }
};
```

#### 2. `services/communityService.ts`
**Add**:
- Request deduplication (prevent double joins)
- Proper error types (network vs business logic)
- Retry mechanism with exponential backoff

```typescript
private activeJoinRequests = new Map<string, Promise<any>>();

async joinCommunity(userId: string, communityId: string): Promise<{
  success: boolean;
  error?: string;
  errorType?: 'network' | 'business' | 'server';
}> {
  // Prevent duplicate requests
  const requestKey = `${userId}-${communityId}`;
  if (this.activeJoinRequests.has(requestKey)) {
    return this.activeJoinRequests.get(requestKey)!;
  }

  const requestPromise = this._executeJoin(userId, communityId);
  this.activeJoinRequests.set(requestKey, requestPromise);

  requestPromise.finally(() => {
    this.activeJoinRequests.delete(requestKey);
  });

  return requestPromise;
}

private async _executeJoin(userId: string, communityId: string) {
  try {
    const { data, error } = await supabase
      .from('community_members')
      .insert({
        user_id: userId,
        community_id: communityId,
        role: 'member',
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // Check for duplicate key (user already a member)
      if (error.code === '23505') {
        return { success: true }; // Idempotent - already a member
      }

      return {
        success: false,
        error: error.message,
        errorType: 'business' as const
      };
    }

    // Update member count via trigger or manually
    await this._incrementMemberCount(communityId);

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error',
      errorType: 'network' as const
    };
  }
}
```

#### 3. Add Real-time Subscription (Optional Enhancement)
**File**: `app/add/community-detail.tsx`

Only subscribe to member count changes from OTHER users:
```typescript
useEffect(() => {
  if (!community?.id) return;

  const channel = supabase
    .channel(`community-${community.id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'communities',
        filter: `id=eq.${community.id}`
      },
      (payload) => {
        // Only update count, not join state (that's user-controlled)
        setCommunity(prev => ({
          ...prev!,
          member_count: payload.new.member_count
        }));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [community?.id]);
```

### Database Changes

#### Ensure Atomic Member Count Updates
**Migration**: `supabase/migrations/YYYYMMDD_community_member_count_trigger.sql`

```sql
-- Trigger to auto-update community member_count
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities
    SET member_count = COALESCE(member_count, 0) + 1
    WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities
    SET member_count = GREATEST(COALESCE(member_count, 1) - 1, 0)
    WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER community_member_count_trigger
AFTER INSERT OR DELETE ON community_members
FOR EACH ROW
EXECUTE FUNCTION update_community_member_count();
```

### UI/UX Improvements

#### Button Loading State
```typescript
<TouchableOpacity
  onPress={handleJoinLeave}
  disabled={isJoining || loading}
  style={[
    styles.joinButton,
    isMember && styles.leaveButton,
    isJoining && styles.joinButtonLoading
  ]}
>
  {isJoining ? (
    <ActivityIndicator size="small" color="#fff" />
  ) : (
    <>
      <Ionicons name={isMember ? "checkmark" : "add"} size={20} color="#fff" />
      <Text style={styles.joinButtonText}>
        {isMember ? 'Member' : 'Join'}
      </Text>
    </>
  )}
</TouchableOpacity>
```

### Analytics & Telemetry
Track:
- Join/leave success rate
- Time from tap to API response
- Error types (network, business, server)
- Retry attempts before success
- User drop-off after failed joins

### Error States and Retries
1. **Network Errors**: Auto-retry up to 3 times with exponential backoff
2. **Duplicate Entry (409)**: Treat as success (idempotent)
3. **Server Errors (500)**: Show error, allow manual retry
4. **Permission Errors**: Show specific message (e.g., "Community is full")

## Definition of Done
- [ ] Join button responds within 200ms of tap
- [ ] Member count updates immediately with optimistic UI
- [ ] All error scenarios properly revert state
- [ ] Owner cannot leave their own community (with clear message)
- [ ] No duplicate join/leave requests during loading
- [ ] Offline actions queue and sync when online
- [ ] Real-time updates from other users don't override user's actions
- [ ] Haptic feedback on iOS
- [ ] Unit tests for all join/leave scenarios
- [ ] E2E tests with network throttling
- [ ] Analytics tracking implemented
- [ ] UX reviewed and approved

## Notes
### Related Files
- `app/add/community-detail.tsx` - Main screen
- `app/add/communities.tsx` - Community list (may have similar issues)
- `services/communityService.ts` - Service layer
- `services/communityAdminService.ts` - Admin operations
- `__tests__/services/communityService.test.ts` - Existing tests to update

### Edge Cases to Test
1. User joins while another user leaves (member count accuracy)
2. User taps join/leave rapidly (debouncing)
3. Community gets deleted while user is viewing it
4. User loses permission mid-session (e.g., banned)
5. App goes to background during join operation

### References
- Discord's server join UX
- Slack's workspace join flow
- [React Native: Optimistic UI Patterns](https://reactnative.dev/docs/optimistic-ui)
