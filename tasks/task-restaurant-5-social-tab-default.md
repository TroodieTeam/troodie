# Make Social Tab Default on Restaurant Page

- Epic: Restaurant Management
- Priority: Medium
- Estimate: 0.5 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Restaurant detail screen should open to the Social tab if there's activity. Hide the "power user/critic" box since that functionality doesn't exist yet. Collapse "Friends who visited" if not populated.

## Business Value
Social proof drives engagement. Users care most about what their friends think. Showing social content first increases trust and conversion (saves, visits). Hiding incomplete features reduces clutter.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Social-first restaurant view
  As a user
  I want to see social activity first
  So that I know what my friends think

  Scenario: Restaurant with friend activity
    Given a restaurant has friend reviews/visits
    When I open the restaurant detail
    Then the Social tab is selected by default
    And I see my friends' activity first

  Scenario: Restaurant with no friend activity
    Given a restaurant has no friend activity
    When I open the restaurant detail
    Then the Overview tab is selected
    And I see general restaurant info

  Scenario: Hide incomplete features
    Given I'm viewing a restaurant
    When I look at the page
    Then the "power user/critic" box is hidden
    And only completed features are shown

  Scenario: Collapse empty sections
    Given a restaurant has no friend visits
    When I view the Social tab
    Then the "Friends who visited" section is hidden
    And I see reviews/saves from friends instead
```

## Technical Implementation

### Tab Default Logic
```typescript
function getDefaultTab(restaurant: Restaurant, user: User): TabType {
  // Check if there's social activity
  const hasFriendActivity = restaurant.friendVisits?.length > 0
    || restaurant.friendReviews?.length > 0
    || restaurant.friendSaves?.length > 0;

  return hasFriendActivity ? 'social' : 'overview';
}

// In RestaurantDetail component
const [selectedTab, setSelectedTab] = useState(
  getDefaultTab(restaurant, user)
);
```

### Conditional Rendering
```tsx
// Hide power user box
{/* Remove or comment out for now
<PowerUserBadge userId={userId} />
*/}

// Collapse empty sections
{friendVisits.length > 0 && (
  <View style={styles.friendVisitsSection}>
    <Text style={styles.sectionTitle}>Friends who visited</Text>
    {friendVisits.map(visit => (
      <FriendVisitCard key={visit.id} visit={visit} />
    ))}
  </View>
)}
```

### Social Tab Content Priority
1. Friends' reviews (most valuable)
2. Friends who saved this restaurant
3. Friends' photos
4. Mutual friends' recommendations
5. Community activity (if no friend activity)

### Tab Bar Configuration
```tsx
const tabs = [
  {
    id: 'social',
    label: 'Social',
    icon: Users,
    badge: friendActivityCount > 0 ? friendActivityCount : null
  },
  { id: 'overview', label: 'Overview', icon: Info },
  { id: 'menu', label: 'Menu', icon: FileText },
  { id: 'photos', label: 'Photos', icon: Camera },
];
```

### Empty State for Social Tab
If user has no friends or no friend activity:
```tsx
<EmptyState
  icon={Users}
  title="No friend activity yet"
  description="Invite friends to see what they think about this place"
  action={{
    label: "Invite Friends",
    onPress: () => router.push('/invite-friends')
  }}
/>
```

## Definition of Done
- [ ] Social tab opens by default when friend activity exists
- [ ] Overview tab default when no friend activity
- [ ] Power user/critic box hidden
- [ ] Friends who visited section collapses when empty
- [ ] Tab badges show activity count
- [ ] Empty state for social tab implemented
- [ ] Smooth tab switching animation
- [ ] Analytics tracking tab views
- [ ] Tested with various social activity scenarios

## Notes
From feedback: "Social tab > I think the restaurant screen should open to social tab if there's activity, we should hide the purple 'power user / critic' box since that functionality doesn't exist yet to give more screen space. Friends who visited should also collapse if not populated."

Quick UX improvement that highlights the most valuable content.
