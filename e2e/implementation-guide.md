# E2E Testing Implementation Guide

## Adding Test IDs to Components

To make E2E tests reliable, add `testID` props to key interactive elements:

### Navigation Components
```jsx
// app/(tabs)/_layout.tsx
<Tabs.Screen
  name="index"
  options={{
    tabBarTestID: "tab-home",
    // ...
  }}
/>

<Tabs.Screen
  name="explore"
  options={{
    tabBarTestID: "tab-explore",
    // ...
  }}
/>
```

### Button Components
```jsx
// Save button
<TouchableOpacity testID="save-button" onPress={handleSave}>
  <Text>Save</Text>
</TouchableOpacity>

// Follow button
<TouchableOpacity testID={isFollowing ? "following-button" : "follow-button"} onPress={handleFollow}>
  <Text>{isFollowing ? 'Following' : 'Follow'}</Text>
</TouchableOpacity>
```

### Input Components
```jsx
// Search input
<TextInput
  testID="search-input"
  placeholder="Search restaurants..."
  value={searchQuery}
  onChangeText={setSearchQuery}
/>

// Review input
<TextInput
  testID="review-input"
  placeholder="Write your review..."
  multiline
/>
```

### List Components
```jsx
// Restaurant cards
{restaurants.map((restaurant, index) => (
  <RestaurantCard
    key={restaurant.id}
    testID={`restaurant-card-${index}`}
    restaurant={restaurant}
  />
))}

// Activity feed items
{activities.map((activity, index) => (
  <ActivityItem
    key={activity.id}
    testID={`activity-item-${index}`}
    activity={activity}
  />
))}
```

### Modal Components
```jsx
// Edit profile modal
<Modal testID="edit-profile-modal" visible={isVisible}>
  <TextInput testID="name-input" value={name} />
  <TextInput testID="bio-input" value={bio} />
  <TouchableOpacity testID="save-profile-button">
    <Text>Save</Text>
  </TouchableOpacity>
</Modal>
```

## Test ID Naming Conventions

### Prefixes
- `tab-` for navigation tabs
- `button-` for action buttons
- `input-` for text inputs
- `card-` for card components
- `modal-` for modals
- `list-` for lists
- `section-` for sections

### Suffixes
- `-${index}` for list items
- `-active` for active states
- `-disabled` for disabled states
- `-loading` for loading states

### Examples
- `tab-home`
- `button-save`
- `input-search`
- `card-restaurant-0`
- `modal-board-selection`
- `list-followers`
- `section-trending`

## Component Updates Needed

### Priority 1 (Required for smoke tests)
- [ ] Navigation tabs - `app/(tabs)/_layout.tsx`
- [ ] Login/Signup forms - `app/auth/*.tsx`
- [ ] Restaurant cards - `components/cards/RestaurantCard.tsx`
- [ ] Save button - `app/restaurant/[id].tsx`
- [ ] Follow button - `components/FollowButton.tsx`

### Priority 2 (Required for regression)
- [ ] Search input - `app/(tabs)/explore.tsx`
- [ ] Filter buttons - `components/filters/*.tsx`
- [ ] Profile edit - `components/modals/EditProfileModal.tsx`
- [ ] Review creation - `app/add/create-post.tsx`
- [ ] Comment input - `components/PostComments.tsx`

### Priority 3 (Nice to have)
- [ ] Settings items
- [ ] Share buttons
- [ ] Board management
- [ ] Community features

## Accessibility Benefits

Adding test IDs also improves accessibility:
```jsx
<TouchableOpacity
  testID="save-button"
  accessibilityLabel="Save restaurant"
  accessibilityRole="button"
  accessibilityState={{ selected: isSaved }}
>
```

## Testing Best Practices

### 1. Stable Selectors
Use test IDs instead of text or class names:
```yaml
# Good
- tapOn:
    id: "save-button"

# Avoid
- tapOn: "Save"  # Text might change
```

### 2. Wait for Elements
Always wait for elements to appear:
```yaml
- assertVisible:
    id: "restaurant-list"
    timeout: 10000
```

### 3. Handle Loading States
Wait for loading to complete:
```yaml
- waitForAnimationToEnd
- assertNotVisible:
    id: "loading-spinner"
```

### 4. Clear State
Start each test with clean state:
```yaml
- launchApp:
    clearState: true
    clearKeychain: true
```

### 5. Test Data Isolation
Use unique test data per test:
```yaml
- inputText: "test_${timestamp}@example.com"
```

## Monitoring Test Health

### Metrics to Track
- Test execution time
- Flakiness rate
- Failure rate by test
- Platform-specific issues

### Flaky Test Detection
```javascript
// Track test results over time
const testResults = {
  testName: "login.yaml",
  runs: 100,
  passes: 95,
  failures: 5,
  flakiness: 5 // 5% flaky
};
```

### Test Maintenance Schedule
- **Daily**: Review failed tests
- **Weekly**: Fix flaky tests
- **Monthly**: Update test data
- **Quarterly**: Refactor test suite

## Troubleshooting Common Issues

### Test Can't Find Element
1. Check test ID is set correctly
2. Verify element is visible
3. Add longer timeout
4. Check if element is scrolled off screen

### Test Fails Intermittently
1. Add explicit waits
2. Check for race conditions
3. Ensure proper state cleanup
4. Review network dependencies

### Different Behavior on Platforms
1. Use platform-specific selectors if needed
2. Account for UI differences
3. Test on both platforms regularly

### Slow Test Execution
1. Reduce unnecessary waits
2. Run tests in parallel
3. Use smoke tests for quick validation
4. Optimize app performance