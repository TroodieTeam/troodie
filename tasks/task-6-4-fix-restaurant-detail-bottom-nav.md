# Task 6.4: Fix Bottom Navigation Positioning on Restaurant Detail Screen

## Overview
Fix the bottom navigation positioning on the restaurant detail screen (`app/restaurant/[id].tsx`) to match the standard positioning used on other screens. Currently, the restaurant detail screen has a custom bottom navigation implementation that doesn't align with the standard Expo Router tab navigation used throughout the app.

## Business Value
- Ensures consistent user experience across all screens
- Maintains visual consistency in navigation positioning
- Prevents user confusion when navigating between screens
- Aligns with the app's design system and navigation patterns

## Dependencies
- None

## Acceptance Criteria

### Gherkin Scenarios

**Scenario: Bottom navigation positioning is consistent**
```
Given I am on the restaurant detail screen
When I view the bottom navigation
Then it should be positioned exactly the same as on other screens
And it should have the same styling and behavior
And it should not interfere with the content layout
```

**Scenario: Navigation functionality works correctly**
```
Given I am on the restaurant detail screen
When I tap any bottom navigation item
Then I should navigate to the correct screen
And the navigation should work smoothly without errors
```

**Scenario: Content layout is not affected**
```
Given I am on the restaurant detail screen
When I scroll through the content
Then the bottom navigation should remain fixed in position
And the content should not be hidden behind the navigation
And the bottom padding should be appropriate
```

**Scenario: Visual consistency with other screens**
```
Given I am on the restaurant detail screen
When I compare the bottom navigation to other screens
Then the styling should be identical
And the positioning should be identical
And the behavior should be identical
```

## Technical Implementation

### Files to Modify
- `app/restaurant/[id].tsx`

### Current Issue
The restaurant detail screen currently has a custom bottom navigation implementation:
```typescript
// Current implementation in app/restaurant/[id].tsx
<View style={styles.bottomNav}>
  <TouchableOpacity style={styles.navItem} onPress={() => router.push('/')}>
    <Home size={20} color={designTokens.colors.textMedium} />
    <Text style={styles.navText}>Home</Text>
  </TouchableOpacity>
  // ... other nav items
</View>
```

### Required Changes

#### 1. Remove Custom Bottom Navigation
- Remove the custom `bottomNav` View and its children
- Remove the `bottomNav` styles from the StyleSheet
- Remove the `bottomPadding` View that was added for the custom nav

#### 2. Use Standard Tab Navigation
- The restaurant detail screen should use the standard Expo Router tab navigation
- This is already configured in `app/(tabs)/_layout.tsx`
- The screen should be accessible through the standard tab navigation

#### 3. Update Screen Structure
```typescript
// Updated structure
return (
  <SafeAreaView style={styles.container}>
    <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[2]}>
      {renderHeader()}
      {renderActionButtons()}
      {renderTabs()}
      {renderTabContent()}
      {/* Remove custom bottomPadding */}
    </ScrollView>
    {/* Remove custom bottomNav */}
  </SafeAreaView>
);
```

#### 4. Update Styles
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  // Remove bottomNav and bottomPadding styles
  // Keep all other existing styles
});
```

### Alternative Approach (If Custom Nav is Required)

If the restaurant detail screen needs to remain outside the tab navigation for some reason:

#### 1. Use Standard Tab Bar Styling
```typescript
// Import the standard tab bar styling
import { Platform } from 'react-native';

const bottomNavStyle = Platform.select({
  ios: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
    paddingBottom: 20, // Account for safe area
  },
  default: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
});
```

#### 2. Use Standard Tab Bar Background
```typescript
// Import and use the standard TabBarBackground component
import TabBarBackground from '@/components/ui/TabBarBackground';

// In the bottom nav JSX
<View style={[styles.bottomNav, bottomNavStyle]}>
  <TabBarBackground />
  {/* Navigation items */}
</View>
```

## Definition of Done
- [ ] Custom bottom navigation removed from restaurant detail screen
- [ ] Screen uses standard Expo Router tab navigation
- [ ] Bottom navigation positioning matches other screens exactly
- [ ] Navigation functionality works correctly
- [ ] Content layout is not affected by navigation changes
- [ ] Visual styling is consistent with other screens
- [ ] No console errors or TypeScript errors
- [ ] Navigation transitions work smoothly

## Notes
- The restaurant detail screen should ideally be part of the standard tab navigation flow
- If the screen needs to remain standalone, ensure it uses the exact same styling as the standard tab bar
- Consider whether the restaurant detail screen should be accessible from the tab navigation or remain as a modal/stack screen
- Test navigation transitions and back button behavior

## Related Files
- `app/restaurant/[id].tsx` - Main file to modify
- `app/(tabs)/_layout.tsx` - Standard tab navigation configuration
- `components/ui/TabBarBackground.tsx` - Standard tab bar background component
- `components/HapticTab.tsx` - Standard tab button component 