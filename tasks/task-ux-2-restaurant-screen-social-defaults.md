# Restaurant Screen - Social Tab Improvements

- Epic: UX
- Priority: Medium
- Estimate: 1 day
- Status: 🔴 Not Started

## Problem Statement

The restaurant detail screen has several UX issues in the social tab:
1. Always defaults to "info" tab, even when social activity exists
2. Shows a purple "power user/critic" box for functionality that doesn't exist yet
3. "Friends who visited" section takes up space even when empty

These issues create a poor user experience by:
- Hiding social activity that users want to see first
- Showing incomplete features (power users)
- Wasting screen real estate on empty sections

## Acceptance Criteria (Gherkin)

**Feature: Smart Tab Default Based on Activity**
  As a user viewing a restaurant
  I want to see the social tab first when there's activity
  So that I can quickly see what my friends and community think

  **Scenario: Restaurant with social activity**
    Given a restaurant exists with recent posts or friend visits
    When a user opens the restaurant screen
    Then the social tab should be selected by default
    And the social content should be immediately visible

  **Scenario: Restaurant without social activity**
    Given a restaurant exists with no posts or friend visits
    When a user opens the restaurant screen
    Then the info tab should be selected by default
    And the user sees restaurant details first

  **Scenario: User manually switches tabs**
    Given a user is on any tab (info, social, photos)
    When they switch to a different tab
    Then the selected tab should persist during that session
    And tab selection should not auto-switch again

**Feature: Hide Power User Section**
  As a user viewing the social tab
  I want to only see completed features
  So that I'm not confused by empty or incomplete functionality

  **Scenario: Social tab without power user box**
    Given a user views the social tab
    Then the purple "power user/critic" box should NOT be visible
    And more screen space should be available for actual content
    And the layout should flow naturally without the section

**Feature: Collapsible Empty Friends Section**
  As a user viewing the social tab
  I want empty sections to be collapsed or hidden
  So that I only see relevant information

  **Scenario: Friends section with visits**
    Given a user has friends who visited the restaurant
    When they view the social tab
    Then the "Friends who visited" section should be expanded
    And friend avatars and names should be displayed

  **Scenario: Friends section with no visits**
    Given a user has no friends who visited the restaurant
    When they view the social tab
    Then the "Friends who visited" section should be collapsed or hidden
    And the space should be used for other content
    And there should be no empty section placeholder

  **Scenario: Expand collapsed section manually**
    Given the friends section is collapsed
    When a user taps "See friends who visited" (optional)
    Then the section should expand
    And show a message like "None of your friends have visited yet"

## Technical Implementation

### Files to Modify

1. **`app/restaurant/[id].tsx`** (Primary changes)
   - Line 61: Change tab default logic from fixed 'info' to smart selection
   - Line 150-180: Add logic to determine if social activity exists
   - Social tab rendering: Remove power user section
   - Social tab rendering: Conditionally render friends section

### Implementation Details

#### Smart Tab Selection (Line 61)

**Current code:**
```typescript
const [activeTab, setActiveTab] = useState<TabType>('info');
```

**New code:**
```typescript
const [activeTab, setActiveTab] = useState<TabType>('info');
const [hasSetInitialTab, setHasSetInitialTab] = useState(false);
```

**Add effect after social data loads (around line 180):**
```typescript
useEffect(() => {
  // Only set initial tab once, when social data finishes loading
  if (!socialDataLoading && !hasSetInitialTab) {
    const hasSocialActivity =
      friendsWhoVisited.length > 0 ||
      recentActivity.length > 0;

    if (hasSocialActivity) {
      setActiveTab('social');
    }

    setHasSetInitialTab(true);
  }
}, [socialDataLoading, friendsWhoVisited, recentActivity, hasSetInitialTab]);
```

#### Remove Power User Section

**Find and remove this code block in the social tab:**
```typescript
{/* Power Users & Critics Section - REMOVE THIS */}
{powerUsersAndCritics.length > 0 && (
  <View style={styles.powerUserSection}>
    <View style={styles.purpleBox}>
      <Crown size={20} color="#9333EA" />
      <Text style={styles.powerUserTitle}>Power Users & Critics</Text>
    </View>
    {powerUsersAndCritics.map((user) => (
      <PowerUserCard key={user.id} user={user} />
    ))}
  </View>
)}
```

**Replace with a comment:**
```typescript
{/* Power Users & Critics Section - Hidden until feature is complete */}
{/* TODO: Re-enable when power user algorithm is implemented */}
```

#### Collapsible Friends Section

**Find friends section rendering and update:**

**Before:**
```typescript
<View style={styles.friendsSection}>
  <Text style={styles.sectionTitle}>Friends Who Visited</Text>
  {friendsWhoVisited.map((friend) => (
    <FriendVisitCard key={friend.id} friend={friend} />
  ))}
</View>
```

**After:**
```typescript
{/* Friends Who Visited - Only show if there are friends */}
{friendsWhoVisited.length > 0 && (
  <View style={styles.friendsSection}>
    <Text style={styles.sectionTitle}>Friends Who Visited</Text>
    {friendsWhoVisited.map((friend) => (
      <FriendVisitCard key={friend.id} friend={friend} />
    ))}
  </View>
)}
```

**Optional: Add empty state that can be expanded:**
```typescript
{friendsWhoVisited.length === 0 && (
  <Pressable
    style={styles.emptyFriendsCollapsed}
    onPress={() => setShowEmptyFriends(!showEmptyFriends)}
  >
    <Users size={16} color="#666" />
    <Text style={styles.emptyFriendsText}>
      See if friends have visited
    </Text>
    <ChevronDown
      size={16}
      color="#666"
      style={{
        transform: [{ rotate: showEmptyFriends ? '180deg' : '0deg' }]
      }}
    />
  </Pressable>
)}

{showEmptyFriends && friendsWhoVisited.length === 0 && (
  <View style={styles.emptyFriendsExpanded}>
    <Text style={styles.emptyFriendsMessage}>
      None of your friends have visited this restaurant yet.
    </Text>
    <Text style={styles.emptyFriendsSubtext}>
      Be the first to save or review it!
    </Text>
  </View>
)}
```

### Complete Modified Code Structure

```typescript
export default function RestaurantDetailScreen() {
  // ... existing state
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [hasSetInitialTab, setHasSetInitialTab] = useState(false);
  const [showEmptyFriends, setShowEmptyFriends] = useState(false);

  // ... existing useEffects

  // Smart tab selection based on social activity
  useEffect(() => {
    if (!socialDataLoading && !hasSetInitialTab) {
      const hasSocialActivity =
        friendsWhoVisited.length > 0 ||
        recentActivity.length > 0;

      if (hasSocialActivity) {
        setActiveTab('social');
      }

      setHasSetInitialTab(true);
    }
  }, [socialDataLoading, friendsWhoVisited, recentActivity, hasSetInitialTab]);

  // ... existing functions

  const renderSocialTab = () => {
    if (socialDataLoading) {
      return <LoadingState message="Loading social activity..." />;
    }

    if (socialDataError) {
      return <ErrorState message="Failed to load social activity" />;
    }

    return (
      <ScrollView style={styles.tabContent}>
        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <View style={styles.activitySection}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {recentActivity.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </View>
        )}

        {/* Friends Who Visited - Only show if populated */}
        {friendsWhoVisited.length > 0 && (
          <View style={styles.friendsSection}>
            <Text style={styles.sectionTitle}>Friends Who Visited</Text>
            {friendsWhoVisited.map((friend) => (
              <FriendVisitCard key={friend.id} friend={friend} />
            ))}
          </View>
        )}

        {/* Power Users - Hidden until feature complete */}
        {/* TODO: Re-enable when power user algorithm is ready */}

        {/* Empty state when no social activity */}
        {recentActivity.length === 0 && friendsWhoVisited.length === 0 && (
          <View style={styles.emptySocialState}>
            <Users size={48} color="#CCC" />
            <Text style={styles.emptyStateTitle}>No social activity yet</Text>
            <Text style={styles.emptyStateMessage}>
              Be the first to share this restaurant with your friends!
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  // ... rest of component
}
```

### Styling Updates

```typescript
const styles = StyleSheet.create({
  // ... existing styles

  // Remove or comment out power user styles
  // powerUserSection: { ... },
  // purpleBox: { ... },
  // powerUserTitle: { ... },

  // Add empty state styles
  emptySocialState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Optional: Collapsed friends state
  emptyFriendsCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 8,
  },
  emptyFriendsText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
});
```

## Testing Plan

### Manual Testing

1. **Test Smart Tab Default - With Activity:**
   - Navigate to a restaurant with posts or friend visits
   - Verify social tab is selected by default
   - Verify social content is immediately visible
   - Switch to info tab manually
   - Verify tab stays on info (doesn't auto-switch)

2. **Test Smart Tab Default - Without Activity:**
   - Navigate to a restaurant with no social activity
   - Verify info tab is selected by default
   - Verify restaurant details are shown
   - Switch to social tab manually
   - Verify empty state is shown

3. **Test Power User Box Hidden:**
   - Navigate to any restaurant
   - Go to social tab
   - Verify no purple "power user/critic" box appears
   - Verify layout flows naturally without it
   - Measure screen space reclaimed

4. **Test Friends Section - With Friends:**
   - Navigate to restaurant where friends visited
   - Verify "Friends who visited" section is visible
   - Verify friend cards display correctly
   - Verify section has proper spacing

5. **Test Friends Section - Without Friends:**
   - Navigate to restaurant where no friends visited
   - Verify "Friends who visited" section is NOT visible
   - Verify no empty placeholder section
   - Verify other content (activity) fills the space

6. **Test Tab Persistence:**
   - Open restaurant on info tab
   - Switch to photos tab
   - Switch back to info tab
   - Close and reopen restaurant
   - Verify initial tab selection logic runs fresh

### Device Testing

- [ ] Test on iOS small screen (iPhone SE)
- [ ] Test on iOS large screen (iPhone 15 Pro Max)
- [ ] Test on Android small screen
- [ ] Test on Android large screen
- [ ] Verify scrolling behavior on all screens

### Edge Cases

1. **No social data loaded yet:**
   - Should default to info tab
   - Should not flash between tabs

2. **Social data loads after initial render:**
   - Tab should switch to social if activity exists
   - Only switch once (hasSetInitialTab prevents loops)

3. **User has no friends:**
   - Friends section should always be hidden
   - Empty state should show in social tab

4. **Power user data exists in state:**
   - Should still be hidden (feature incomplete)
   - Data can remain in state for future use

## Performance Considerations

- Tab switching should be instant (no re-fetching)
- Smart tab logic should only run once per screen mount
- Conditional rendering should not cause layout shifts
- Social data loading should not block other tabs

## Rollback Plan

If issues arise:
1. Revert to fixed `activeTab='info'` default
2. Re-enable power user section if needed
3. Show friends section regardless of data
4. Deploy fix for smart tab logic independently

## Related Files

- `app/restaurant/[id].tsx` - Main restaurant screen (lines 61, 150-180, social tab rendering)
- `services/socialActivityService.ts` - Social data fetching
- `components/restaurant/FriendVisitCard.tsx` - Friend visit display
- `components/restaurant/ActivityCard.tsx` - Activity display
- `components/restaurant/PowerUserCard.tsx` - Power user display (to be hidden)

## Success Metrics

- [ ] Restaurants with activity default to social tab
- [ ] Restaurants without activity default to info tab
- [ ] Power user section is completely hidden
- [ ] Friends section only shows when populated
- [ ] No layout shifts or flashing during tab selection
- [ ] Screen space is better utilized
- [ ] User feedback confirms improved experience

## Future Enhancements

1. **Power User Algorithm:**
   - Implement critic/power user detection
   - Re-enable purple box section when ready
   - Add verification badges for critics

2. **Friends Section:**
   - Add "Invite friends to visit" CTA when empty
   - Show friend visit timeline
   - Add friend review summaries

3. **Tab Memory:**
   - Remember user's last selected tab per restaurant
   - Persist in AsyncStorage or user preferences
   - Restore on next visit
